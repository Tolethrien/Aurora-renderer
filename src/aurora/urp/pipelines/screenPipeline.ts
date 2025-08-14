import { PipelineBind } from "../../aurora";
import Aurora from "../../core";
import Renderer from "../renderer/renderer";
import AuroraDebugInfo from "../debugger/debugInfo";
import screen from "../shaders/display/screenMixQuad.wgsl?raw";
import debug from "../shaders/display/debug.wgsl?raw";
import { ToneMapList } from "../renderer/config";

type displayMode = "screen" | "debug";
/**
 * final pass to show texture on screen
 */
export default class ScreenPipeline {
  private static displayNormalPipeline: GPURenderPipeline;
  private static displayDebugPipeline: GPURenderPipeline;
  private static displayNormalBind: PipelineBind;
  private static displayDebugBindLayout: PipelineBind[1];
  private static displayMode: displayMode = "screen";
  private static displayedDebugTexture = "";
  private static dataDirty = false;
  private static currentBindData: PipelineBind[0];
  private static debugOptionsBuffer: GPUBuffer;
  public static clearPipeline() {}
  public static async createPipeline() {
    const normalShader = Aurora.createShader("screenShader", screen);
    const debugShader = Aurora.createShader("debugShader", debug);

    this.displayNormalBind = Aurora.createBindGroup({
      label: "screenBind",
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
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("finalDraw"),
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("gui"),
        },
      ],
    });
    this.displayDebugBindLayout = Aurora.createBindLayout({
      label: "debugLayout",
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
          buffer: { type: "uniform" },
        },
      ],
    });

    const normalPipelineLayout = Aurora.createPipelineLayout([
      this.displayNormalBind[1],
    ]);
    const debugPipelineLayout = Aurora.createPipelineLayout([
      this.displayDebugBindLayout,
    ]);
    this.displayNormalPipeline = await Aurora.createRenderPipeline({
      shader: normalShader,
      pipelineName: "PresentationPipeline",
      buffers: [],
      pipelineLayout: normalPipelineLayout,
    });
    this.displayDebugPipeline = await Aurora.createRenderPipeline({
      shader: debugShader,
      pipelineName: "PresentationPipeline",
      buffers: [],
      pipelineLayout: debugPipelineLayout,
    });

    this.debugOptionsBuffer = Aurora.createBuffer({
      label: "DebugOptionsBuffer",
      bufferType: "uniform",
      dataLength: 2,
      dataType: "Uint32Array",
    });
  }

  public static usePipeline(): void {
    if (this.dataDirty && this.displayMode !== "screen") this.generateBind();

    const indexBuffer = Renderer.getBuffer("index");
    const commandEncoder = Renderer.getEncoder;
    const pipeline =
      this.displayMode === "screen"
        ? this.displayNormalPipeline
        : this.displayDebugPipeline;
    const bind =
      this.displayMode === "screen"
        ? this.displayNormalBind[0]
        : this.currentBindData;
    const passEncoder = commandEncoder.beginRenderPass({
      label: "presentationRenderPass",
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
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bind);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    AuroraDebugInfo.accumulate("drawCalls", 1);
    AuroraDebugInfo.accumulate("pipelineInUse", [
      `display:${this.displayMode}`,
    ]);
  }
  private static generateBind() {
    const uniformData = new Uint32Array([0, 0]);
    const { meta } = Renderer.getTexture(this.displayedDebugTexture);
    if (meta.format === "r16float") {
      uniformData[0] = 1;
    } else if (meta.format === "rgba16float") {
      const toneMap = Renderer.getConfigGroup("rendering").toneMapping;
      uniformData[1] = ToneMapList[toneMap];
    }
    const bind = Aurora.getNewBindGroupFromLayout(
      {
        label: "debugBind",
        entries: [
          {
            binding: 0,
            resource: Renderer.getSampler("linear"),
          },
          {
            binding: 1,
            resource: Renderer.getTextureView(this.displayedDebugTexture),
          },
          {
            binding: 2,
            resource: { buffer: this.debugOptionsBuffer },
          },
        ],
      },
      this.displayDebugBindLayout
    );
    this.currentBindData = bind;
    this.dataDirty = false;
    Aurora.device.queue.writeBuffer(this.debugOptionsBuffer, 0, uniformData, 0);
  }
  public static setDisplayMode(mode: displayMode, texture: string) {
    this.displayMode = mode;
    this.displayedDebugTexture = texture;
    this.dataDirty = true;
  }
}
