import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import shapeShader from "../shaders/shape.wgsl?raw";
import WBOITShader from "../shaders/WBOIT.wgsl?raw";
interface BatchAccumulator {
  verticesData: Float32Array;
  addData: Uint32Array;
  count: number;
}
/**
 * Main pipeline to draw shapes,sprites etc. Uses WBOIT, so have 2 passes, opaque and transparent!
 */
export default class ShapePipe {
  private static BATCH_SIZE = 100;
  private static VERTEX_STRIDE = 8;
  private static ADD_STRIDE = 6;
  public static opaqueDrawBatch: BatchAccumulator[] = [];
  public static transparentDrawBatch: BatchAccumulator[] = [];
  private static pipeline: GPURenderPipeline;
  private static transparentPipeline: GPURenderPipeline;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;

  public static get getStride() {
    return {
      vertexStride: this.VERTEX_STRIDE,
      addStride: this.ADD_STRIDE,
    };
  }
  public static async createPipeline() {
    const shapeSh = Aurora.createShader("shapeShader", shapeShader);
    const oitSh = Aurora.createShader("WBOITShader", WBOITShader);

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
    const cameraBindLayout = Batcher.getBuildInCameraBindGroupLayout;
    const userTextureLayout = Batcher.getUserTextureBindGroupLayout;

    const pipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      userTextureLayout,
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
    const addDataBuffLay = Aurora.createVertexBufferLayout({
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
    this.pipeline = await Aurora.createRenderPipeline({
      shader: shapeSh,
      pipelineName: "main",
      buffers: [vertBuffLay, addDataBuffLay],
      pipelineLayout: pipelineLayout,
      primitive: { topology: "triangle-list" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "greater-equal",
      },
      colorTargets: [Aurora.getColorTargetTemplate("standard")],
    });
    this.transparentPipeline = await Aurora.createRenderPipeline({
      shader: oitSh,
      pipelineName: "main",
      buffers: [vertBuffLay, addDataBuffLay],
      pipelineLayout: pipelineLayout,
      primitive: { topology: "triangle-list" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "greater-equal",
      },
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
  public static getBatch(type: "opaque" | "transparent") {
    const batchType =
      type === "opaque" ? this.opaqueDrawBatch : this.transparentDrawBatch;
    if (batchType.length === 0) {
      batchType.push(this.createEmptyBatch());
    }
    let batch = batchType[batchType.length - 1];

    if (batch.count >= this.BATCH_SIZE) {
      console.log(`Batch ${batchType.length} pełny. Tworzę nowy.`);
      batch = this.createEmptyBatch();
      batchType.push(batch);
    }
    Batcher.pipelinesUsedInFrame.add("shape");
    return batch;
  }
  public static usePipeline(type: "opaque" | "transparent"): void {
    const offscreenTexture = Batcher.offscreenCanvas.texture.createView();
    const accuTexture = Batcher.depthAccumulativeTexture.texture.createView();
    const reveTexture = Batcher.depthRevealableTexture.texture.createView();
    const userTextureBind = Batcher.getUserTextureBindGroup;

    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = Batcher.getBuildInCameraBindGroup;
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
            view: Batcher.depthTexture.texture.createView(),
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
        passEncoder.setBindGroup(1, userTextureBind);

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
            view: Batcher.depthTexture.texture.createView(),
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
        passEncoder.setBindGroup(1, userTextureBind);

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
