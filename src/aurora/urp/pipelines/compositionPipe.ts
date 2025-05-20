import Aurora from "../../core";
import Batcher, { PipelineBind } from "../batcher";
import screenQUadShader from "../shaders/screenQuad.wgsl?raw";

export default class CompositePipe {
  private static pipeline: GPURenderPipeline;
  private static presentationBind: PipelineBind;
  //TODO: czy moge zrobic z tego array i zapisywac do 3 tekstur jednego arr jednoczesnie?
  public static createPipeline() {
    const shader = Aurora.createShader("screenQUadShader", screenQUadShader);

    this.presentationBind = Aurora.creteBindGroup({
      name: "presentationBind",
      layout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d" },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d" },
          },
          {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d" },
          },
        ],
        label: "presentationBindLayout",
      },
      data: {
        label: "presentationBindData",
        entries: [
          { binding: 0, resource: Batcher.universalSampler },
          {
            binding: 1,
            resource: Batcher.offscreenCanvas.texture.createView(),
          },
          {
            binding: 2,
            resource: Batcher.depthAccumulativeTexture.texture.createView(),
          },
          {
            binding: 3,
            resource: Batcher.depthRevealableTexture.texture.createView(),
          },
        ],
      },
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      this.presentationBind[1],
    ]);
    this.pipeline = Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "compositePiepieline",
      buffers: [],
      pipelineLayout: pipelineLayout,
    });
  }

  public static usePipeline(): void {
    const indexBuffer = Batcher.getIndexBuffer;
    const commandEncoder = Aurora.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: Aurora.context.getCurrentTexture().createView(),
          clearValue: { r: 0.3, g: 0, b: 0.6, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.presentationBind[0]);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    Aurora.device.queue.submit([commandEncoder.finish()]);
  }
}
