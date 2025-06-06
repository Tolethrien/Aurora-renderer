import Aurora from "../../core";
import Batcher from "../batcher";
import textShader from "../msdf/tempShad.wgsl?raw";

export default class Text2Pipe {
  private static pipeline: GPURenderPipeline;
  private static batchSize = 1000;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;
  public static opaqueDrawBatch: Array<{
    verts: Float32Array;
    addData: Uint32Array;
    count: number;
  }> = [];
  private static bind: [GPUBindGroup, GPUBindGroupLayout];
  public static createPipeline() {
    const shader = Aurora.createShader("textShader", textShader);

    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      dataLength: this.batchSize * 4, // quad vertices per instance
      dataType: "Float32Array",
      label: "TextVertexBuffer",
    });
    this.addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      dataLength: this.batchSize * 8, // 3 uints (charID, textSize) + color (4)
      dataType: "Uint32Array",
      label: "TextAddDataBuffer",
    });

    const cameraBindLayout = Batcher.getBuildInCameraBindGroupLayout;
    this.bind = Batcher.textData.fontMeta!.bind;

    const layout = Aurora.createPipelineLayout([
      cameraBindLayout,
      this.bind[1],
    ]);

    const vertBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: 4 * 2 * Float32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        { format: "float32x2", offset: 0, shaderLocation: 0 }, // center
        {
          format: "float32x2",
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 1,
        }, // size
        {
          format: "float32x4",
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 2,
        }, // texCrop
      ],
    });
    const addDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: 6 * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        { format: "uint32", offset: 0, shaderLocation: 3 }, // charID
        {
          format: "uint32x4",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 4,
        }, // color
        {
          format: "uint32",
          offset: 5 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 5,
        }, // textSize
      ],
    });

    this.pipeline = Aurora.createRenderPipeline({
      shader,
      pipelineName: "text",
      buffers: [vertBuffLay, addDataBuffLay],
      pipelineLayout: layout,
      primitive: { topology: "triangle-list" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "greater-equal",
      },
    });
  }

  private static createEmptyBatch() {
    return {
      verts: new Float32Array(this.batchSize * 4 * 2),
      addData: new Uint32Array(this.batchSize * 6),
      count: 0,
    };
  }

  public static getBatch() {
    if (this.opaqueDrawBatch.length === 0)
      this.opaqueDrawBatch.push(this.createEmptyBatch());
    let batch = this.opaqueDrawBatch[this.opaqueDrawBatch.length - 1];
    if (batch.count >= this.batchSize) {
      batch = this.createEmptyBatch();
      this.opaqueDrawBatch.push(batch);
    }
    Batcher.pipelinesUsedInFrame.add("text");
    return batch;
  }

  public static usePipeline(): void {
    const textureView = Aurora.context.getCurrentTexture().createView();
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = Batcher.getBuildInCameraBindGroup;
    const userTextureBind = Batcher.getUserTextureBindGroup;

    this.opaqueDrawBatch.forEach((batch) => {
      const encoder = Aurora.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          { view: textureView, loadOp: "load", storeOp: "store" },
        ],
        depthStencilAttachment: {
          view: Batcher.depthTexture.texture.createView(),
          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });

      Aurora.device.queue.writeBuffer(this.vertexBuffer, 0, batch.verts);
      Aurora.device.queue.writeBuffer(this.addBuffer, 0, batch.addData);

      pass.setPipeline(this.pipeline);
      pass.setVertexBuffer(0, this.vertexBuffer);
      pass.setVertexBuffer(1, this.addBuffer);
      pass.setBindGroup(0, cameraBind);
      pass.setBindGroup(1, this.bind[0]);
      pass.setIndexBuffer(indexBuffer, "uint32");
      pass.drawIndexed(6, batch.count);
      pass.end();
      Aurora.device.queue.submit([encoder.finish()]);
    });
  }

  public static clearBatch() {
    this.opaqueDrawBatch = [];
  }
}
