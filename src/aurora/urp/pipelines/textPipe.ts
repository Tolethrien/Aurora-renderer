import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraCamera from "../camera";
import textShader from "../shaders/text.wgsl?raw";
import TextWBOITShader from "../shaders/textWBOIT.wgsl?raw";

interface BatchAccumulator {
  verticesData: Float32Array;
  addData: Uint32Array;
  count: number;
}
/**
 * Camera bound Text Rendering pipeline, uses MSDF to generate scalable font and calculete data on CPU to have access to manipulation!
 */
export default class TextPipe {
  private static BATCH_SIZE = 100;
  private static VERTEX_STRIDE = 8;
  private static ADD_STRIDE = 5;
  public static opaqueDrawBatch: BatchAccumulator[] = [];
  public static transparentDrawBatch: BatchAccumulator[] = [];
  private static pipeline: GPURenderPipeline;
  private static transparentPipeline: GPURenderPipeline;

  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;
  public static async createPipeline() {
    const isZSorted = Batcher.getBatcherOptions.zBuffer === "y";

    const shader = Aurora.createShader("textShader", textShader);

    let oitSh = undefined;
    if (isZSorted) oitSh = Aurora.createShader("WBOITShader", TextWBOITShader);

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
    const textBindLayout = Batcher.getUserFontBindGroupLayout;
    const batcherOptionsLayout = Batcher.getBatcherOptionsGroupLayout;
    const pipelineLayout = Aurora.createPipelineLayout([
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
          shaderLocation: 1, // size
        },
        {
          format: "float32x4",
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 2, // textureCrop
        },
      ],
    });
    const addDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: this.ADD_STRIDE * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "uint32",
          offset: 0,
          shaderLocation: 3, //textureIndex
        },
        {
          format: "uint32x4",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 4, //tint
        },
      ],
    });
    const stencil: GPUDepthStencilState = {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "greater-equal",
    };
    this.pipeline = await Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "main",
      buffers: [vertBuffLay, addDataBuffLay],
      pipelineLayout: pipelineLayout,
      primitive: { topology: "triangle-list" },
      depthStencil: isZSorted ? stencil : undefined,
      colorTargets: [Aurora.getColorTargetTemplate("standard")],
    });
    if (isZSorted)
      this.transparentPipeline = await Aurora.createRenderPipeline({
        shader: oitSh!,
        pipelineName: "main",
        buffers: [vertBuffLay, addDataBuffLay],
        pipelineLayout: pipelineLayout,
        primitive: { topology: "triangle-list" },
        depthStencil: stencil,
        colorTargets: [
          Aurora.getColorTargetTemplate("OITAccu"),
          Aurora.getColorTargetTemplate("OITReve"),
        ],
      });
  }

  private static createEmptyBatch(): BatchAccumulator {
    return {
      verticesData: new Float32Array(this.BATCH_SIZE * this.VERTEX_STRIDE),
      addData: new Uint32Array(this.BATCH_SIZE * this.ADD_STRIDE),
      count: 0,
    };
  }
  public static getBatch(alpha: number) {
    let batch: BatchAccumulator;
    const isZSorted = Batcher.getBatcherOptions.zBuffer === "y";
    if (!isZSorted) {
      if (this.opaqueDrawBatch.length === 0)
        this.opaqueDrawBatch.push(this.createEmptyBatch());
      batch = this.opaqueDrawBatch.at(-1)!;
      if (batch.count >= this.BATCH_SIZE) {
        console.log(`Batch ${this.opaqueDrawBatch.length} pełny. Tworzę nowy.`);
        batch = this.createEmptyBatch();
        this.opaqueDrawBatch.push(batch);
      }
    } else {
      const batchType =
        alpha === 255 ? this.opaqueDrawBatch : this.transparentDrawBatch;
      if (batchType.length === 0) {
        batchType.push(this.createEmptyBatch());
      }
      batch = batchType.at(-1)!;
      if (batch.count >= this.BATCH_SIZE) {
        console.log(`Batch ${batchType.length} pełny. Tworzę nowy.`);
        batch = this.createEmptyBatch();
        batchType.push(batch);
      }
    }
    Batcher.pipelinesUsedInFrame.add("text");
    return batch;
  }
  public static useUnsortedPipeline() {
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const offscreenTexture = Batcher.getTextureView("offscreenCanvas");
    const batcherOptionsBind = Batcher.getBatcherOptionsBindGroup;

    const fontBind = Batcher.getUserFontBindGroup;
    this.opaqueDrawBatch.forEach((batch) => {
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
      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        0,
        batch.verticesData,
        0
      );
      Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      passEncoder.setVertexBuffer(1, this.addBuffer);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, fontBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);

      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      Aurora.device.queue.submit([commandEncoder.finish()]);
    });
  }
  public static useOpaquePipeline() {
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const offscreenTexture = Batcher.getTextureView("offscreenCanvas");
    const fontBind = Batcher.getUserFontBindGroup;
    const batcherOptionsBind = Batcher.getBatcherOptionsBindGroup;

    this.opaqueDrawBatch.forEach((batch) => {
      const commandEncoder = Aurora.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: offscreenTexture,
            loadOp: "load",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: Batcher.getTextureView("depthTexture"),

          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });
      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        0,
        batch.verticesData,
        0
      );
      Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      passEncoder.setVertexBuffer(1, this.addBuffer);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, fontBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);

      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      Aurora.device.queue.submit([commandEncoder.finish()]);
    });
  }
  public static useTransparentPipeline() {
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const accuTexture = Batcher.getTextureView("depthAccumulativeTexture");
    const reveTexture = Batcher.getTextureView("depthRevealableTexture");
    const fontBind = Batcher.getUserFontBindGroup;
    const batcherOptionsBind = Batcher.getBatcherOptionsBindGroup;

    this.transparentDrawBatch.forEach((batch) => {
      const commandEncoder = Aurora.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: accuTexture,
            loadOp: "load",
            storeOp: "store",
          },
          {
            view: reveTexture,
            loadOp: "load",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: Batcher.getTextureView("depthTexture"),

          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });
      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        0,
        batch.verticesData,
        0
      );
      Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
      passEncoder.setPipeline(this.transparentPipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      passEncoder.setVertexBuffer(1, this.addBuffer);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, fontBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);

      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      Aurora.device.queue.submit([commandEncoder.finish()]);
    });
  }
  public static usePipeline(type: "opaque" | "transparent"): void {
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const offscreenTexture = Batcher.getTextureView("offscreenCanvas");
    const accuTexture = Batcher.getTextureView("depthAccumulativeTexture");
    const reveTexture = Batcher.getTextureView("depthRevealableTexture");
    const fontBind = Batcher.getUserFontBindGroup;
    const batchType =
      type === "opaque" ? this.opaqueDrawBatch : this.transparentDrawBatch;
    if (type === "opaque") {
      batchType.forEach((batch) => {
        const commandEncoder = Aurora.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: offscreenTexture,
              loadOp: "load",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: Batcher.getTextureView("depthTexture"),

            depthLoadOp: "load",
            depthStoreOp: "store",
          },
        });
        Aurora.device.queue.writeBuffer(
          this.vertexBuffer,
          0,
          batch.verticesData,
          0
        );
        Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setVertexBuffer(1, this.addBuffer);
        passEncoder.setBindGroup(0, cameraBind);
        passEncoder.setBindGroup(1, fontBind);
        passEncoder.setIndexBuffer(indexBuffer, "uint32");
        passEncoder.drawIndexed(6, batch.count);
        passEncoder.end();
        Aurora.device.queue.submit([commandEncoder.finish()]);
      });
    } else {
      batchType.forEach((batch) => {
        const commandEncoder = Aurora.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: accuTexture,
              loadOp: "load",
              storeOp: "store",
            },
            {
              view: reveTexture,
              loadOp: "load",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: Batcher.getTextureView("depthTexture"),

            depthLoadOp: "load",
            depthStoreOp: "store",
          },
        });
        Aurora.device.queue.writeBuffer(
          this.vertexBuffer,
          0,
          batch.verticesData,
          0
        );
        Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
        //   passEncoder.setBindGroup(0,)
        passEncoder.setPipeline(this.transparentPipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setVertexBuffer(1, this.addBuffer);
        passEncoder.setBindGroup(0, cameraBind);
        passEncoder.setBindGroup(1, fontBind);

        passEncoder.setIndexBuffer(indexBuffer, "uint32");
        passEncoder.drawIndexed(6, batch.count);
        passEncoder.end();
        Aurora.device.queue.submit([commandEncoder.finish()]);
      });
    }
  }
  public static clearBatch() {
    this.opaqueDrawBatch = [];
    this.transparentDrawBatch = [];
  }
}
