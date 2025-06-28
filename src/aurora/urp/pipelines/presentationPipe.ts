import { PipelineBind } from "../../aurora";
import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraDebugInfo from "../debugger/debugInfo";
import presentationShader from "../shaders/presentation.wgsl?raw";

/**
 * Used to draw final offscreen onto canvas, possible post-proccesing like grayscale goes here too!
 */
export default class PresentationPipe {
  private static pipeline: GPURenderPipeline;
  private static presentationBind: PipelineBind;
  public static async createPipeline() {
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
          { binding: 0, resource: Batcher.getSampler("universal") },

          {
            binding: 1,
            resource: Batcher.getTextureView("offscreenCanvas"),
          },
        ],
      },
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      this.presentationBind[1],
    ]);
    this.pipeline = await Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "PresentationPipeline",
      buffers: [],
      pipelineLayout: pipelineLayout,
    });
  }

  public static usePipeline(): void {
    const indexBuffer = Batcher.getIndexBuffer;
    const commandEncoder = Batcher.getEncoder;
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: Aurora.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      timestampWrites: AuroraDebugInfo.isWorking
        ? {
            querySet: AuroraDebugInfo.getQuery().qSet,
            endOfPassWriteIndex: 1,
          }
        : undefined,
    });
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.presentationBind[0]);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    AuroraDebugInfo.accumulate("drawCalls", 1);
    AuroraDebugInfo.accumulate("pipelineInUse", ["presentation"]);
  }
}
