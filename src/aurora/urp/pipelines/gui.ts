//
import Aurora from "../../core";
import Renderer from "../renderer/renderer";
import AuroraDebugInfo from "../debugger/debugInfo";
//drawQuad
// drawText
// clip

/**
 * clip musi byc dodawany jako obiekt bo musi wystartowac nowy pipeline
 * text ma miec glowne obliczanie na GPU, ale pozycje na CPU
 * quad to quad xD
 *
 */
const BATCH_INIT_SIZE = {
  quad: 100,
  text: 500,
  quadTransparent: 50,
  textTransparent: 150,
};
interface BatchNode {
  initBatchSize: number;
  batchSize: number;
  vertices: Float32Array<ArrayBuffer>;
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
const SHAPE_BINDS = ["userTextures"];
const TEXT_BINDS = ["fonts"];
const PIPELINES_DATA: PipelineDescriptor[] = [
  {
    depthWrite: true,
    name: "quad",
    shader: "guiShader",
    binds: SHAPE_BINDS,
  },
  {
    depthWrite: true,
    name: "text",
    shader: "guiTextShader",
    binds: TEXT_BINDS,
  },

  {
    depthWrite: false,
    name: "quadTransparent",
    shader: "guiShader",
    binds: SHAPE_BINDS,
  },
  {
    depthWrite: false,
    name: "textTransparent",
    shader: "guiTextShader",
    binds: TEXT_BINDS,
  },
];
export default class GuiPipeline {
  private static VERTEX_STRIDE = 15;
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
    const texture = Renderer.getTextureView("gui");
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
      const { pipeline, bindList } = this.getPipeline(batch.shader);
      const passEncoder = commandEncoder.beginRenderPass({
        label: `SortedDrawShapeRenderPass:${batch.shader}`,
        colorAttachments: [
          {
            view: texture,
            loadOp: loadOperation,
            clearValue: [0, 0, 0, 0],
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: Renderer.getTextureView("depthUI"),
          depthLoadOp: loadOperation,
          depthClearValue: 0.0,
          depthStoreOp: "store",
        },
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
    Renderer.pipelinesUsedInFrame.add("guiPipeline");
    AuroraDebugInfo.accumulate("pipelineInUse", ["gui"]);
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
          format: "float32",
          offset: 9 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 4, // layer
        },
        {
          format: "float32",
          offset: 10 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 5, // round
        },
        {
          format: "float32x4",
          offset: 11 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 6, // tint
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

    const pipe = await Aurora.createRenderPipeline({
      shader: gpuShader,
      pipelineName: `${name}Pipeline`,
      buffers: [vertexLayout],
      pipelineLayout: shapePipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: [Aurora.getColorTargetTemplate("standard")],
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: depthWrite,
        depthCompare: "greater-equal",
      },
    });
    return [pipe, bindsDataList];
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
