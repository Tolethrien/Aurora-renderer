import Aurora from "../../core";
import Batcher from "../batcher";
import shapeShader from "../shaders/shape.wgsl?raw";
import oitShader from "../shaders/OIT.wgsl?raw";

export default class ShapePipe {
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
  private static transparentPipeline: GPURenderPipeline;
  private static batchSize = 100;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;

  public static createPipeline() {
    const shapeSh = Aurora.createShader("shapeShader", shapeShader);
    const oitSh = Aurora.createShader("oitShader", oitShader);

    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "VertexBuffer",
      dataLength: this.batchSize * 4,
      dataType: "Float32Array",
    });
    this.addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "addDataBuffer",
      dataLength: this.batchSize * 5,
      dataType: "Uint32Array",
    });
    const cameraBindLayout = Batcher.getBuildInCameraBindGroupLayout;
    const pipelineLayout = Aurora.createPipelineLayout([cameraBindLayout]);
    const vertBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: 4 * Float32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // Position, see vertex shader
        },
        {
          format: "float32x2",
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 1, // Position, see vertex shader
        },
      ],
    });
    const addDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: 5 * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "uint32",
          offset: 0,
          shaderLocation: 2, // Position, see vertex shader
        },
        {
          format: "uint32x4",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 3, // Position, see vertex shader
        },
      ],
    });
    this.pipeline = Aurora.createRenderPipeline({
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
    this.transparentPipeline = Aurora.createRenderPipeline({
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

  private static createEmptyBatch() {
    return {
      verts: new Float32Array(this.batchSize * 4),
      addData: new Uint32Array(this.batchSize * 5),
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
    Batcher.pipelinesUsedInFrame.add("shape");
    return batch;
  }
  public static usePipeline(type: "opaque" | "transparent"): void {
    const offscreenTexture = Batcher.offscreenCanvas.texture.createView();
    const accuTexture = Batcher.depthAccumulativeTexture.texture.createView();
    const reveTexture = Batcher.depthRevealableTexture.texture.createView();
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
        Aurora.device.queue.writeBuffer(this.vertexBuffer, 0, batch.verts, 0);
        Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
        //   passEncoder.setBindGroup(0,)
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setVertexBuffer(1, this.addBuffer);
        passEncoder.setBindGroup(0, cameraBind);
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
        Aurora.device.queue.writeBuffer(this.vertexBuffer, 0, batch.verts, 0);
        Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData, 0);
        //   passEncoder.setBindGroup(0,)
        passEncoder.setPipeline(this.transparentPipeline);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setVertexBuffer(1, this.addBuffer);
        passEncoder.setBindGroup(0, cameraBind);
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
