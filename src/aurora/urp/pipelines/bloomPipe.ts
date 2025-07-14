import { CreateBindGroup, PipelineBind } from "../../aurora";
import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraDebugInfo from "../debugger/debugInfo";
import bloomX from "../shaders/bloomX.wgsl?raw";
import bloomY from "../shaders/bloomY.wgsl?raw";
import downscale from "../shaders/downscaling.wgsl?raw";
import upscale from "../shaders/upscale.wgsl?raw";

/**
 * bloom 2 pass gaussian blur pipeline
 */
export default class BloomPipeline {
  private static pipelineX: GPUComputePipeline;
  private static pipelineY: GPUComputePipeline;
  private static downscalePipeline: GPUComputePipeline;
  private static upscalePipeline: GPUComputePipeline;
  private static bloomBindLayout: PipelineBind["1"];
  private static bloomScaleBindLayout: PipelineBind["1"];
  private static bindListOrder: [string, string, string][] = [
    ["x", "HDR", "bloomXOne"],
    ["y", "bloomXOne", "bloomYOne"],
    ["downscale", "bloomYOne", "bloomYTwo"],

    ["x", "bloomYTwo", "bloomXTwo"],
    ["y", "bloomXTwo", "bloomYTwo"],
    ["downscale", "bloomYTwo", "bloomYThree"],

    ["x", "bloomYThree", "bloomXThree"],
    ["y", "bloomXThree", "bloomYThree"],
    ["downscale", "bloomYThree", "bloomYFour"],

    ["x", "bloomYFour", "bloomXFour"],
    ["y", "bloomXFour", "bloomYFour"],
    ["upscale", "bloomYFour", "bloomYThree"],

    ["x", "bloomYThree", "bloomXThree"],
    ["y", "bloomXThree", "bloomYThree"],
    ["upscale", "bloomYThree", "bloomYTwo"],

    ["x", "bloomYTwo", "bloomXTwo"],
    ["y", "bloomXTwo", "bloomYTwo"],
    ["upscale", "bloomYTwo", "bloomYOne"],

    ["x", "bloomYOne", "bloomXOne"],
    ["y", "bloomXOne", "bloomYOne"],
  ];
  // hdr --X-pass--> oneX
  // oneX --Y-pass--> oneY
  // oneY --downscale--> twoY

  // twoY --X-pass--> twoX
  // twoX --Y-pass--> twoY
  // twoY --downscale--> threeY

  // threeY --X-pass--> threeX
  // threeX --Y-pass--> threeY
  // threeY --downscale--> fourY

  // fourY --X-pass--> fourX
  // fourX --Y-pass--> fourY
  public static async createPipeline() {
    const bloomXShader = Aurora.createShader("bloomX", bloomX);
    const bloomYShader = Aurora.createShader("bloomY", bloomY);
    const downscaleShader = Aurora.createShader("downscale", downscale);
    const upscaleShader = Aurora.createShader("upscale", upscale);
    this.bloomBindLayout = Aurora.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { viewDimension: "2d", sampleType: "unfilterable-float" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            viewDimension: "2d",
            access: "write-only",
            format: "rgba16float",
          },
        },
      ],
      label: "bloomPassBindLayout",
    });
    this.bloomScaleBindLayout = Aurora.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            viewDimension: "2d",
            access: "write-only",
            format: "rgba16float",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          sampler: { type: "filtering" },
        },
      ],
      label: "bloomPassBindLayout",
    });

    const pipelineLayout = Aurora.createPipelineLayout([this.bloomBindLayout]);
    const pipelineScaleLayout = Aurora.createPipelineLayout([
      this.bloomScaleBindLayout,
    ]);
    this.pipelineX = await Aurora.createComputePipeline({
      shader: bloomXShader,
      pipelineName: "bloomXPassPipeline",
      pipelineLayout: pipelineLayout,
    });
    this.pipelineY = await Aurora.createComputePipeline({
      shader: bloomYShader,
      pipelineName: "bloomYPassPipeline",
      pipelineLayout: pipelineLayout,
    });
    this.downscalePipeline = await Aurora.createComputePipeline({
      shader: downscaleShader,
      pipelineName: "bloomScalePassPipeline",
      pipelineLayout: pipelineScaleLayout,
    });
    this.upscalePipeline = await Aurora.createComputePipeline({
      shader: upscaleShader,
      pipelineName: "bloomScalePassPipeline",
      pipelineLayout: pipelineScaleLayout,
    });
  }

  public static usePipeline(): void {
    let scaleLevel = 0;
    const scalar = [1, 0.75, 0.5, 0.25, 0.5, 0.75, 1];
    const commandEncoder = Batcher.getEncoder;
    const sampler = Batcher.getSampler("linear");
    for (const instruction of this.bindListOrder) {
      const textureSize = {
        x: Math.ceil((Aurora.canvas.width * scalar[scaleLevel]) / 8),
        y: Math.ceil((Aurora.canvas.height * scalar[scaleLevel]) / 8),
      };
      const pipeline = this.pickPipeline(instruction[0]);
      const texturesSet = this.setNewData(
        Batcher.getTextureView(instruction[1]),
        Batcher.getTextureView(instruction[2]),
        instruction[0] === "downscale" || instruction[0] === "upscale"
          ? sampler
          : undefined,
        instruction[0]
      );
      const bindData = Aurora.swapBindGroupData(
        texturesSet,
        instruction[0] === "downscale" || instruction[0] === "upscale"
          ? this.bloomScaleBindLayout
          : this.bloomBindLayout
      );
      const passEncoderOne = commandEncoder.beginComputePass({
        label: "bloomComputePass",
      });
      passEncoderOne.setPipeline(pipeline);
      passEncoderOne.setBindGroup(0, bindData);
      passEncoderOne.dispatchWorkgroups(textureSize.x, textureSize.y);
      passEncoderOne.end();
      if (instruction[0] === "downscale" || instruction[0] === "upscale")
        scaleLevel++;
      AuroraDebugInfo.accumulate("computeCalls", 1);
    }
    AuroraDebugInfo.accumulate("pipelineInUse", ["bloom"]);
  }
  private static pickPipeline(passType: string) {
    if (passType === "downscale") return this.downscalePipeline;
    else if (passType === "upscale") return this.upscalePipeline;
    else if (passType === "x") return this.pipelineX;
    else if (passType === "y") return this.pipelineY;
    throw new Error(
      `pass type can be only downscale,upscale,x,y. Getting: ${passType}`
    );
  }
  private static setNewData(
    input: GPUTextureView,
    output: GPUTextureView,
    sampler: GPUSampler | undefined,
    label?: string
  ): CreateBindGroup["data"] {
    const baseBind: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: input,
      },
      {
        binding: 1,
        resource: output,
      },
    ];
    if (sampler)
      baseBind.push({
        binding: 2,
        resource: sampler,
      });
    return {
      label: `bloomPassBindData:${label ?? ""}`,
      entries: baseBind,
    };
  }
}
