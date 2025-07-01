import { PipelineBind } from "../../aurora";
import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraDebugInfo from "../debugger/debugInfo";

/**
 * Used to draw final offscreen onto canvas, possible post-proccesing like grayscale goes here too!
 */
export default class DebugTexturePipe {
  private static pipeline: GPURenderPipeline;
  private static dataBind: PipelineBind;
  private static texturesBind: PipelineBind;
  private static uniformTexturePicker: GPUBuffer;
  public static async createPipeline() {
    const textureArrayShader = Batcher.getShader("textureFromArray");
    this.uniformTexturePicker = Aurora.createBuffer({
      bufferType: "uniform",
      dataLength: 1,
      dataType: "Uint32Array",
      label: "DebugTextureIndex",
    });
    this.dataBind = Aurora.creteBindGroup({
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
            buffer: { type: "uniform" },
          },
        ],
        label: "DebugTextureSamplersBindLayout",
      },
      data: {
        label: "DebugTextureSamplersBindLayout",
        entries: [
          { binding: 0, resource: Batcher.getSampler("universal") },

          {
            binding: 1,
            resource: { buffer: this.uniformTexturePicker },
          },
        ],
      },
    });
    this.texturesBind = Aurora.creteBindGroup({
      layout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d" },
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
        label: "DebugTextureTexturesBindLayout",
      },
      data: {
        label: "DebugTextureTexturesBindData",
        entries: [
          { binding: 0, resource: Batcher.getTextureView("offscreenCanvas") },
          {
            binding: 1,
            resource: Batcher.getTextureView("zBufferDump"),
          },
          { binding: 2, resource: Batcher.getTextureView("lightMap") },
        ],
      },
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      this.dataBind[1],
      this.texturesBind[1],
    ]);
    this.pipeline = await Aurora.createRenderPipeline({
      shader: textureArrayShader,
      pipelineName: "DebugTexturePipeline",
      buffers: [],
      pipelineLayout: pipelineLayout,
    });
  }

  public static usePipeline(): void {
    const indexBuffer = Batcher.getIndexBuffer;
    const commandEncoder = Batcher.getEncoder;
    Aurora.device.queue.writeBuffer(
      this.uniformTexturePicker,
      0,
      AuroraDebugInfo.getVisibleTexture,
      0
    );
    const passEncoder = commandEncoder.beginRenderPass({
      label: "debugTextureRenderPass",
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
    passEncoder.setBindGroup(0, this.dataBind[0]);
    passEncoder.setBindGroup(1, this.texturesBind[0]);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    AuroraDebugInfo.accumulate("drawCalls", 1);
    AuroraDebugInfo.accumulate("pipelineInUse", ["debugTexture"]);
  }
}
