import Aurora from "../../core";
import Batcher, { PipelineBind } from "../batcher/batcher";
import WBOITPresent from "../shaders/WBOITPresent.wgsl?raw";

/**
 * WBOIT second pipeline to calculate color and draw transparent objects onto offscreen
 */
export default class WBOITPipeline {
  private static pipeline: GPURenderPipeline;
  private static presentationBind: PipelineBind;
  //TODO: czy moge zrobic z tego array i zapisywac do 3 tekstur jednego arr jednoczesnie?
  public static async createPipeline() {
    const shader = Aurora.createShader("WBOITPresent", WBOITPresent);

    this.presentationBind = Aurora.creteBindGroup({
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
        ],
        label: "WBOITBindLayout",
      },
      data: {
        label: "WBOITBindData",
        entries: [
          { binding: 0, resource: Batcher.universalSampler },

          {
            binding: 1,
            resource: Batcher.depthAccumulativeTexture.texture.createView(),
          },
          {
            binding: 2,
            resource: Batcher.depthRevealableTexture.texture.createView(),
          },
        ],
      },
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      this.presentationBind[1],
    ]);
    this.pipeline = await Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "WBOITPipeline",
      buffers: [],
      pipelineLayout: pipelineLayout,
    });
  }

  public static usePipeline(): void {
    const indexBuffer = Batcher.getIndexBuffer;
    const offscreenTexture = Batcher.offscreenCanvas.texture.createView();

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
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.presentationBind[0]);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    Aurora.device.queue.submit([commandEncoder.finish()]);
  }
}
