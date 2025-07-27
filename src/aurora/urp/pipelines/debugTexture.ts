import { PipelineBind } from "../../aurora";
import Aurora from "../../core";
import Renderer from "../batcher/renderer";
import AuroraDebugInfo from "../debugger/debugInfo";

/**
 * Used to draw final offscreen onto canvas, possible post-proccesing like grayscale goes here too!
 */
export default class DebugTexturePipeline {
  private static pipeline: GPURenderPipeline;
  private static dataBind: PipelineBind;
  private static texturesBind: PipelineBind;
  private static uniformTexturePicker: GPUBuffer;
  public static clearPipeline() {}
  public static async createPipeline() {
    const debugShader = Renderer.getShader("debugShader");
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
          { binding: 0, resource: Renderer.getSampler("universal") },

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
          {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d" },
          },
        ],
        label: "DebugTextureTexturesBindLayout",
      },
      data: {
        label: "DebugTextureTexturesBindData",
        entries: [
          { binding: 0, resource: Renderer.getTextureView("offscreenCanvas") },
          {
            binding: 1,
            resource: Renderer.getTextureView("zBufferDump"),
          },
          { binding: 2, resource: Renderer.getTextureView("lightMap") },
          { binding: 3, resource: Renderer.getTextureView("bloomXPass", 0) },
        ],
      },
    });
    const [_, bloomParamsLayout] = Renderer.getBind("bloomParams");

    const pipelineLayout = Aurora.createPipelineLayout([
      this.dataBind[1],
      this.texturesBind[1],
      bloomParamsLayout,
    ]);
    this.pipeline = await Aurora.createRenderPipeline({
      shader: debugShader,
      pipelineName: "DebugTexturePipeline",
      buffers: [],
      pipelineLayout: pipelineLayout,
      colorTargets: [
        {
          format: "bgra8unorm",
          blend: undefined,
          writeMask: GPUColorWrite.ALL,
        },
      ],
    });
  }

  public static usePipeline(): void {
    const indexBuffer = Renderer.getBuffer("index");
    const commandEncoder = Renderer.getEncoder;
    const [bloomParams] = Renderer.getBind("bloomParams");
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
    passEncoder.setBindGroup(2, bloomParams);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    AuroraDebugInfo.accumulate("drawCalls", 1);
    AuroraDebugInfo.accumulate("pipelineInUse", ["debugTexture"]);
  }
}
