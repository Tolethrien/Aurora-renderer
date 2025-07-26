import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraCamera from "../camera";
import AuroraDebugInfo from "../debugger/debugInfo";

const USED_SHADERS = ["quad", "circle"] as const;
type ShaderType = (typeof USED_SHADERS)[number];
interface PipelineDescriptor {
  name: ShaderType;
  shader: string;
}
interface BatchNode {
  vertices: number[];
  counter: number;
  shader: ShaderType;
}
export default class SequentialDrawPipeline {
  private static INIT_SIZE = 50;
  private static currentBufferSize = this.INIT_SIZE;
  private static VERTEX_STRIDE = 14;
  private static pipelines: Map<string, GPURenderPipeline> = new Map();
  private static vertexBuffer: GPUBuffer;

  private static verticesList = new Float32Array(
    this.INIT_SIZE * this.VERTEX_STRIDE
  );
  public static get getStride() {
    return this.VERTEX_STRIDE;
  }
  private static batchList: BatchNode[] = [];
  public static async createPipeline() {
    this.generateVertexLayout();
    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "sequentialDrawVertexBuffer",
      dataLength: this.INIT_SIZE * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
    for (const shaderType of USED_SHADERS) {
      const name = shaderType;
      const pipeline = await this.generatePipeline({
        name,
        shader: `${name}Shader`,
      });
      this.pipelines.set(name, pipeline);
    }
  }
  public static usePipeline() {
    this.validateBufferSize();
    const offscreenTexture = Batcher.getTextureView("offscreenCanvas");
    const userTextureBind = Batcher.getUserTextureBindGroup;
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const batcherOptionsBind = Batcher.getBatcherOptionsBindGroup;
    const commandEncoder = Batcher.getEncoder;
    let bufferByteOffset = 0;
    let vertexListOffset = 0;
    this.batchList.forEach((batch) => {
      this.verticesList.set(batch.vertices, vertexListOffset);
      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        bufferByteOffset,
        this.verticesList,
        vertexListOffset
      );
      const loadOperation = bufferByteOffset === 0 ? "clear" : "load";
      const pipeline = this.getPipeline(batch.shader);
      const timestamp = this.getFrameQuery(bufferByteOffset === 0);
      const passEncoder = commandEncoder.beginRenderPass({
        label: `SortedDrawShapeRenderPass:${batch.shader}`,
        colorAttachments: [
          {
            view: offscreenTexture,
            loadOp: loadOperation,
            clearValue: [0.5, 0.5, 0.5, 1],
            storeOp: "store",
          },
        ],
        timestampWrites: timestamp,
      });
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer, bufferByteOffset);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, userTextureBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);
      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.counter);
      passEncoder.end();
      bufferByteOffset +=
        batch.counter * this.VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT;
      vertexListOffset += batch.vertices.length;

      AuroraDebugInfo.accumulate("drawCalls", 1);
    });
    Batcher.pipelinesUsedInFrame.add("SequentialDrawPipeline");
    AuroraDebugInfo.accumulate("pipelineInUse", ["SequentialDraw"]);
  }

  public static clearPipeline() {
    this.batchList = [];
  }
  public static getBatch(shader: string) {
    let cutShaderName = shader;
    if (shader.includes("Transparent")) cutShaderName = shader.slice(0, -11);
    const batchNode = this.batchList.at(-1);
    if (batchNode === undefined || batchNode.shader !== cutShaderName) {
      const newBatch = this.newBatchNode(cutShaderName as ShaderType);
      this.batchList.push(newBatch);
      return newBatch;
    }
    return batchNode;
  }
  private static getPipeline(name: ShaderType) {
    return this.pipelines.get(name)!;
  }
  private static validateBufferSize() {
    const drawSize = this.batchList.reduce(
      (prev, batch) => (prev += batch.counter),
      0
    );
    if (this.currentBufferSize >= drawSize) return;
    const newSize = drawSize * 1.5;
    this.verticesList = new Float32Array(newSize * this.VERTEX_STRIDE);
    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "sequentialDrawVertexBuffer",
      dataLength: newSize * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
    this.currentBufferSize = newSize;
  }
  private static getFrameQuery(write: boolean) {
    if (!AuroraDebugInfo.isWorking || write === false) return undefined;
    return {
      querySet: AuroraDebugInfo.getQuery().qSet,
      beginningOfPassWriteIndex: 0,
    };
  }
  private static newBatchNode(shader: ShaderType) {
    return {
      counter: 0,
      shader: shader,
      vertices: [],
    } as BatchNode;
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
  private static async generatePipeline({ name, shader }: PipelineDescriptor) {
    const vertexLayout = this.generateVertexLayout();
    const cameraBindLayout = AuroraCamera.getBuildInCameraBindGroupLayout;
    const userTextureLayout = Batcher.getUserTextureBindGroupLayout;
    const batcherOptionsLayout = Batcher.getBatcherOptionsGroupLayout;
    const shapePipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      userTextureLayout,
      batcherOptionsLayout,
    ]);
    const gpuShader = Batcher.getShader(shader);
    const targets = [Aurora.getColorTargetTemplate("HDR")];
    const pipe = await Aurora.createRenderPipeline({
      shader: gpuShader,
      pipelineName: `${name}Pipeline`,
      buffers: [vertexLayout],
      pipelineLayout: shapePipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: targets,
    });
    return pipe;
  }
}
