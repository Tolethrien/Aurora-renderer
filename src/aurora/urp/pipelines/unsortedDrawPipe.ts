import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraCamera from "../camera";
import { BatchAccumulator, GetBatch } from "../draw";

/**
 * Main unsorted pipeline to draw shapes,sprites etc.
 */
export default class UnsortedDrawPipeline {
  private static BATCH_SIZE = 1000;
  private static VERTEX_STRIDE = 8;
  private static ADD_STRIDE = 6;
  public static drawBatch: BatchAccumulator[] = [];
  private static shapePipeline: GPURenderPipeline;
  private static textPipeline: GPURenderPipeline;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;

  public static get getStride() {
    return {
      vertexStride: this.VERTEX_STRIDE,
      addStride: this.ADD_STRIDE,
    };
  }

  public static async createPipeline() {
    const shapeSh = Batcher.getShader("shapeShader");
    const textSh = Batcher.getShader("textShader");

    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "VertexBuffer",
      dataLength: this.BATCH_SIZE * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
    this.addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "addDataBuffer",
      dataLength: this.BATCH_SIZE * this.ADD_STRIDE,
      dataType: "Uint32Array",
    });
    const cameraBindLayout = AuroraCamera.getBuildInCameraBindGroupLayout;
    const userTextureLayout = Batcher.getUserTextureBindGroupLayout;
    const batcherOptionsLayout = Batcher.getBatcherOptionsGroupLayout;
    const textBindLayout = Batcher.getUserFontBindGroupLayout;

    const shapePipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      userTextureLayout,
      batcherOptionsLayout,
    ]);
    const textPipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      textBindLayout,
      batcherOptionsLayout,
    ]);
    const vertBuffLay = Aurora.createVertexBufferLayout({
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
      ],
    });
    const AddDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: this.ADD_STRIDE * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "uint32",
          offset: 0,
          shaderLocation: 3, // shapeType: 0 - rect, 1 - ellipse, 2 - sprite
        },
        {
          format: "uint32",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 4, //textureIndex
        },
        {
          format: "uint32x4",
          offset: 2 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 5, //tint
        },
      ],
    });

    this.shapePipeline = await Aurora.createRenderPipeline({
      shader: shapeSh,
      pipelineName: "unsortedDrawShape",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: shapePipelineLayout,
      primitive: { topology: "triangle-list" },
    });
    this.textPipeline = await Aurora.createRenderPipeline({
      shader: textSh,
      pipelineName: "unsortedDrawText",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: textPipelineLayout,
      primitive: { topology: "triangle-list" },
    });
  }

  private static createEmptyBatch(type: GetBatch["type"]): BatchAccumulator {
    return {
      verticesData: [],
      addData: [],
      count: 0,
      type,
    };
  }
  public static getBatch(type: GetBatch["type"]) {
    if (this.drawBatch.length === 0)
      this.drawBatch.push(this.createEmptyBatch(type));
    let batch = this.drawBatch.at(-1)!;
    if (batch.type !== type || batch.count >= this.BATCH_SIZE)
      this.drawBatch.push(this.createEmptyBatch(type));
    batch = this.drawBatch.at(-1)!;
    Batcher.pipelinesUsedInFrame.add("unsortedDraw");
    return batch;
  }

  public static usePipeline() {
    const offscreenTexture = Batcher.getTextureView("offscreenCanvas");
    const userTextureBind = Batcher.getUserTextureBindGroup;
    const fontBind = Batcher.getUserFontBindGroup;
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const batcherOptionsBind = Batcher.getBatcherOptionsBindGroup;

    this.drawBatch.forEach((batch) => {
      const vert = new Float32Array(batch.verticesData);
      const add = new Uint32Array(batch.addData);
      Aurora.device.queue.writeBuffer(this.vertexBuffer, 0, vert, 0);
      Aurora.device.queue.writeBuffer(this.addBuffer, 0, add, 0);
      const pipeline =
        batch.type === "shape" ? this.shapePipeline : this.textPipeline;
      const textureBind = batch.type === "shape" ? userTextureBind : fontBind;
      const commandEncoder = Aurora.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: offscreenTexture,
            loadOp: "load",
            storeOp: "store",
          },
        ],
      });
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      passEncoder.setVertexBuffer(1, this.addBuffer);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, textureBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);

      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      Aurora.device.queue.submit([commandEncoder.finish()]);
    });
  }

  public static clearBatch() {
    this.drawBatch = [];
  }
}
