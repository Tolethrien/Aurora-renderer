import { PipelineBind } from "../../aurora";
import Aurora from "../../core";
import { ToneMapList } from "../renderer/config";
import Renderer from "../renderer/renderer";
import AuroraDebugInfo from "../debugger/debugInfo";
import debugTextureShader from "../shaders/display/debug.wgsl?raw";

/**
 * temporary Debug pipeline
 */
export default class DebuggerPipeline {
  private static pipeline: GPURenderPipeline;
  private static dataBind: PipelineBind;
  private static texturesBind: PipelineBind;
  private static uniformTexturePicker: GPUBuffer;
  public static clearPipeline() {}
  public static async createPipeline() {
    const debugShader = Aurora.createShader("debugShader", debugTextureShader);

    this.uniformTexturePicker = Aurora.createBuffer({
      bufferType: "uniform",
      dataLength: 1,
      dataType: "Uint32Array",
      label: "DebugTextureIndex",
    });
    this.dataBind = Aurora.createBindGroup({
      label: "DebugTextureBindA",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { sampler: {} },
          resource: Renderer.getSampler("linear"),
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { buffer: { type: "uniform" } },
          resource: { buffer: this.uniformTexturePicker },
        },
      ],
    });
    this.texturesBind = Aurora.createBindGroup({
      label: "DebugTextureTexturesBind",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("offscreenCanvas"),
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("zBufferDump"),
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("lightMap"),
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("bloomEffect", 0),
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("finalDraw"),
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("gui"),
        },
      ],
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      this.dataBind[1],
      this.texturesBind[1],
    ]);
    this.pipeline = await Aurora.createRenderPipeline({
      shader: debugShader,
      pipelineName: "DebugTexturePipeline",
      buffers: [],
      pipelineLayout: pipelineLayout,
      colorTargets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
          blend: undefined,
          writeMask: GPUColorWrite.ALL,
        },
      ],
      consts: {
        toneMapping: ToneMapList[Renderer.getAllConfig.rendering.toneMapping],
      },
    });
  }

  public static usePipeline(): void {
    const indexBuffer = Renderer.getBuffer("index");
    const commandEncoder = Renderer.getEncoder;
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
    AuroraDebugInfo.accumulate("pipelineInUse", ["Display:Debug"]);
  }
}
