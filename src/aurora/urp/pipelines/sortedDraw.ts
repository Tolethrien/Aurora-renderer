import Aurora from "../../core";
import Renderer from "../batcher/renderer";
import AuroraDebugInfo from "../debugger/debugInfo";
//POPRAWKI POTEM:
// trzymac gdzies generalnie shadery bo po co generowac takie same
// przebudowac shadery na vert i frag bo sporo vertow tych samych uzywam
const BATCH_INIT_SIZE = {
  quad: 100,
  circle: 50,
  text: 100,
  quadTransparent: 20,
  circleTransparent: 20,
  textTransparent: 50,
};
interface BatchNode {
  initBatchSize: number;
  batchSize: number;
  vertices: Float32Array;
  counter: number;
  shader: keyof typeof BATCH_INIT_SIZE;
}
interface PipelineDescriptor {
  name: keyof typeof BATCH_INIT_SIZE;
  depthWrite: boolean;
  shader: string;
  binds: string[];
}
interface RenderPipelineData {
  pipeline: GPURenderPipeline;
  bindList: GPUBindGroup[];
}
const SHAPE_BINDS = ["camera", "userTextures"];
const TEXT_BINDS = ["camera", "fonts"];
const PIPELINES_DATA: PipelineDescriptor[] = [
  {
    depthWrite: true,
    name: "quad",
    shader: "quadShader",
    binds: SHAPE_BINDS,
  },
  {
    depthWrite: true,
    name: "circle",
    shader: "circleShader",
    binds: SHAPE_BINDS,
  },
  {
    depthWrite: true,
    name: "text",
    shader: "textShader",
    binds: TEXT_BINDS,
  },
  {
    depthWrite: false,
    name: "quadTransparent",
    shader: "quadShader",
    binds: SHAPE_BINDS,
  },
  {
    depthWrite: false,
    name: "circleTransparent",
    shader: "circleShader",
    binds: SHAPE_BINDS,
  },
  {
    depthWrite: false,
    name: "textTransparent",
    shader: "textShader",
    binds: TEXT_BINDS,
  },
];
export default class SortedDrawPipeline {
  private static VERTEX_STRIDE = 14;
  private static bufferNeedResize = false;

  private static vertexBuffer: GPUBuffer;
  public static batchList: Map<string, BatchNode> = new Map();
  private static pipelines: Map<string, RenderPipelineData> = new Map();
  public static async createPipeline() {
    this.generateBatchData();
    this.generateGPUBuffer();
    for (const descriptor of PIPELINES_DATA) {
      const name = descriptor.name;
      const [pipeline, binds] = await this.generatePipeline(descriptor);
      this.pipelines.set(name, { pipeline, bindList: binds });
    }
  }
  public static usePipeline() {
    if (this.bufferNeedResize) this.generateGPUBuffer();
    const offscreenTexture = Renderer.getTextureView("offscreenCanvas");
    const zBufferTexture = Renderer.getTextureView("zBufferDump");
    const indexBuffer = Renderer.getBuffer("index");
    const commandEncoder = Renderer.getEncoder;
    let byteOffset = 0;

    this.batchList.forEach((batch) => {
      //let first pass go even when empty to clear canvas, no need for other empty passes
      if (byteOffset !== 0 && batch.counter === 0) return;
      const list = batch.vertices;
      if (batch.shader.includes("Transparent"))
        this.sortTransparentBatch(batch);
      Aurora.device.queue.writeBuffer(this.vertexBuffer, byteOffset, list, 0);
      //use zbuffer dump when debug mode
      const loadOperation = byteOffset === 0 ? "clear" : "load";
      const zDumpTarget = this.getZDump(zBufferTexture, loadOperation);
      const { pipeline, bindList } = this.getPipeline(batch.shader);
      const timestamp = this.getFrameQuery(byteOffset === 0);
      const passEncoder = commandEncoder.beginRenderPass({
        label: `SortedDrawShapeRenderPass:${batch.shader}`,
        colorAttachments: [
          {
            view: offscreenTexture,
            loadOp: loadOperation,
            clearValue: [0.5, 0.5, 0.5, 1],
            storeOp: "store",
          },
          zDumpTarget,
        ],
        depthStencilAttachment: {
          view: Renderer.getTextureView("depthTexture"),
          depthLoadOp: loadOperation,
          depthClearValue: 0.0,
          depthStoreOp: "store",
        },
        timestampWrites: timestamp,
      });
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer, byteOffset);
      bindList.forEach((bind, index) => passEncoder.setBindGroup(index, bind));
      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.counter);
      passEncoder.end();
      byteOffset += list.byteLength;
      AuroraDebugInfo.accumulate("drawCalls", 1);
      AuroraDebugInfo.accumulate("drawnQuads", batch.counter);
    });
    Renderer.pipelinesUsedInFrame.add("SortedDrawPipeline");
    AuroraDebugInfo.accumulate("pipelineInUse", ["SortedDraw"]);
  }
  public static clearPipeline() {
    this.batchList.forEach((shader) => (shader.counter = 0));
    this.bufferNeedResize = false;
  }
  public static get getStride() {
    return this.VERTEX_STRIDE;
  }
  public static getBatch(key: keyof typeof BATCH_INIT_SIZE) {
    const batch = this.batchList.get(key);
    if (!batch)
      throw new Error(
        `no Draw Batch with name ${key} in sortedDraw, should be imposable`
      );
    if (batch.counter === batch.batchSize) {
      const newSize = Math.ceil(batch.batchSize * 1.5);
      batch.batchSize = newSize;
      const batchVerticesCopy = batch.vertices;
      batch.vertices = new Float32Array(newSize * this.VERTEX_STRIDE);
      batch.vertices.set(batchVerticesCopy, 0);
      this.bufferNeedResize = true;
    }
    return batch;
  }
  private static generateBatchData() {
    Object.entries(BATCH_INIT_SIZE).forEach((shader) => {
      const initSize = shader[1];
      this.batchList.set(shader[0], {
        batchSize: initSize,
        initBatchSize: initSize,
        vertices: new Float32Array(initSize * this.VERTEX_STRIDE),
        counter: 0,
        shader: shader[0] as keyof typeof BATCH_INIT_SIZE,
      });
    });
  }

  private static getPipeline(name: keyof typeof BATCH_INIT_SIZE) {
    return this.pipelines.get(name)!;
  }

  private static generateGPUBuffer() {
    const totalBatchSize = Array.from(this.batchList.values()).reduce(
      (sum, node) => (sum += node.batchSize),
      0
    );
    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "sortedDrawVertexBuffer",
      dataLength: totalBatchSize * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
  }
  private static generateVertexLayout() {
    return Aurora.createVertexBufferLayout({
      arrayStride: this.VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // Position
        },
        {
          format: "float32x2",
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 1, // Size
        },
        {
          format: "float32x4",
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 2, // textureCrop
        },
        {
          format: "float32",
          offset: 8 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 3, // textureIndex
        },
        {
          format: "float32x4",
          offset: 9 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 4, // tint
        },
        {
          format: "float32",
          offset: 13 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 5, // emissive
        },
      ],
    });
  }

  private static async generatePipeline({
    depthWrite,
    name,
    shader,
    binds,
  }: PipelineDescriptor): Promise<[GPURenderPipeline, GPUBindGroup[]]> {
    const vertexLayout = this.generateVertexLayout();
    const bindLayoutList = binds.map(
      (bindName) => Renderer.getBind(bindName)[1]
    );
    const bindsDataList = binds.map(
      (bindName) => Renderer.getBind(bindName)[0]
    );
    const shapePipelineLayout = Aurora.createPipelineLayout(bindLayoutList);
    const gpuShader = Renderer.getShader(shader);
    const renderOption = Renderer.getConfigGroup("rendering");
    const drawOrigin = renderOption.drawOrigin === "center" ? 0 : 1;
    const zSort = renderOption.sortOrder === "none" ? 0 : 1;
    const targets = AuroraDebugInfo.isWorking
      ? [
          Aurora.getColorTargetTemplate("HDR"),
          Aurora.getColorTargetTemplate("zBufferDump"),
        ]
      : [Aurora.getColorTargetTemplate("HDR")];
    const pipe = await Aurora.createRenderPipeline({
      shader: gpuShader,
      pipelineName: `${name}Pipeline`,
      buffers: [vertexLayout],
      pipelineLayout: shapePipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: targets,
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: depthWrite,
        depthCompare: "greater-equal",
      },
      consts: {
        zSortType: zSort,
        originType: drawOrigin,
      },
    });
    return [pipe, bindsDataList];
  }
  private static getFrameQuery(write: boolean) {
    if (!AuroraDebugInfo.isWorking || write === false) return undefined;
    return {
      querySet: AuroraDebugInfo.getQuery().qSet,
      beginningOfPassWriteIndex: 0,
    };
  }
  private static getZDump(texture: GPUTextureView, loadOp: "clear" | "load") {
    if (!AuroraDebugInfo.isWorking) return undefined;
    return {
      view: texture,
      loadOp: loadOp,
      storeOp: "store",
    } as GPURenderPassColorAttachment;
  }
  private static sortTransparentBatch(shaderNode: BatchNode) {
    const { vertices, counter, batchSize } = shaderNode;
    const Y_OFFSET_IN_STRIDE = 1;
    const indices = Array.from({ length: counter }, (_, i) => i);
    indices.sort((a, b) => {
      const yA = vertices[a * this.VERTEX_STRIDE + Y_OFFSET_IN_STRIDE];
      const yB = vertices[b * this.VERTEX_STRIDE + Y_OFFSET_IN_STRIDE];
      return yA - yB;
    });
    const sortedVertices = new Float32Array(batchSize * this.VERTEX_STRIDE);

    for (let i = 0; i < counter; i++) {
      const originalIndex = indices[i];
      const sourceOffset = originalIndex * this.VERTEX_STRIDE;
      const destOffset = i * this.VERTEX_STRIDE;
      for (let j = 0; j < this.VERTEX_STRIDE; j++) {
        sortedVertices[destOffset + j] = vertices[sourceOffset + j];
      }
    }
    shaderNode.vertices = sortedVertices;
  }
}
