import Aurora from "../../core";
import Batcher, { PipelineBind } from "../batcher";
import presentationShader from "../shaders/presentation.wgsl?raw";

export default class PresentationPipe {
  private static pipeline: GPURenderPipeline;
  private static presentationBind: PipelineBind;
  public static createPipeline() {
    const shader = Aurora.createShader(
      "presentationShader",
      presentationShader
    );

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
        ],
        label: "PresentationBindLayout",
      },
      data: {
        label: "PresentationBindData",
        entries: [
          { binding: 0, resource: Batcher.universalSampler },

          {
            binding: 1,
            resource: Batcher.offscreenCanvas.texture.createView(),
          },
        ],
      },
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      this.presentationBind[1],
    ]);
    this.pipeline = Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "PresentationPipeline",
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
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
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
