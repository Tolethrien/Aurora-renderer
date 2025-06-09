import Aurora from "../../core";
import Batcher, { PipelineBind } from "../batcher";
import textShader from "../shaders/text.wgsl?raw";

export default class TextPipe {
  public static opaqueDrawBatch: {
    verts: Float32Array;
    addData: Uint32Array;
    count: number;
  }[] = [];
  public static transparentDrawBatch: {
    verts: Float32Array;
    addData: Uint32Array;
    count: number;
  }[] = [];
  private static pipeline: GPURenderPipeline;
  private static batchSize = 1000;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;
  private static textBind: PipelineBind;
  private static VERTEX_STRIDE = 8;
  private static ADD_STRIDE = 5;
  public static createPipeline() {
    const shader = Aurora.createShader("textShader", textShader);

    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "VertexBuffer",
      dataLength: this.batchSize * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
    this.addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "addDataBuffer",
      dataLength: this.batchSize * this.ADD_STRIDE,
      dataType: "Uint32Array",
    });
    const cameraBindLayout = Batcher.getBuildInCameraBindGroupLayout;
    this.textBind = Batcher.textData.getMeta!.bind;
    const pipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      this.textBind[1],
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
    this.pipeline = Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "main",
      buffers: [vertBuffLay, addDataBuffLay],
      pipelineLayout: pipelineLayout,
      primitive: { topology: "triangle-list" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "greater-equal",
      },
      colorTargets: [
        {
          format: "bgra8unorm",
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    });
  }

  private static createEmptyBatch() {
    return {
      verts: new Float32Array(this.batchSize * this.VERTEX_STRIDE),
      addData: new Uint32Array(this.batchSize * this.ADD_STRIDE),
      count: 0,
    };
  }
  public static getBatch(type: "opaque" | "transparent") {
    const batchType =
      type === "opaque" ? this.opaqueDrawBatch : this.transparentDrawBatch;
    if (batchType.length === 0) {
      batchType.push(this.createEmptyBatch());
    }
    let batch = batchType[batchType.length - 1];

    if (batch.count >= this.batchSize) {
      console.log(`Batch ${batchType.length} pełny. Tworzę nowy.`);
      batch = this.createEmptyBatch();
      batchType.push(batch);
    }
    Batcher.pipelinesUsedInFrame.add("text");
    return batch;
  }
  public static usePipeline(type: "opaque" | "transparent"): void {
    const textureView = Batcher.offscreenCanvas.texture.createView();
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = Batcher.getBuildInCameraBindGroup;

    const batchType =
      type === "opaque" ? this.opaqueDrawBatch : this.transparentDrawBatch;
    batchType.forEach((batch) => {
      const commandEncoder = Aurora.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            loadOp: "load",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: Batcher.depthTexture.texture.createView(),
          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });
      Aurora.device.queue.writeBuffer(this.vertexBuffer, 0, batch.verts, 0);
      Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      passEncoder.setVertexBuffer(1, this.addBuffer);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, this.textBind[0]);
      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      Aurora.device.queue.submit([commandEncoder.finish()]);
    });
  }
  public static clearBatch() {
    this.opaqueDrawBatch = [];
    this.transparentDrawBatch = [];
  }
}
