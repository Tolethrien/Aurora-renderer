import Vec2D from "../../../utils/vec2D";
import { CreateBindGroup, PipelineBind, Position2D } from "../../aurora";
import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraDebugInfo from "../debugger/debugInfo";
import bloomX from "../shaders/bloomX.wgsl?raw";
import bloomY from "../shaders/bloomY.wgsl?raw";
import downscale from "../shaders/downscaling.wgsl?raw";
import upscale from "../shaders/upscale.wgsl?raw";
import threshold from "../shaders/bloomTreshhold.wgsl?raw";
type TexturePassType = "bloomXPass" | "bloomYPass" | "bloomThreshold";
type PassType = "x" | "y" | "upscale" | "downscale";
type MipMapLevelToUse = number;
type PassOrderList = [
  PassType,
  TexturePassType,
  TexturePassType,
  MipMapLevelToUse
];
/**
 * bloom 2 pass gaussian blur pipeline
 */
export default class BloomPipeline {
  private static pipelineX: GPUComputePipeline;
  private static pipelineY: GPUComputePipeline;
  private static downscalePipeline: GPUComputePipeline;
  private static upscalePipeline: GPUComputePipeline;
  private static thresholdPipeline: GPUComputePipeline;
  private static bloomBindLayout: PipelineBind["1"];
  private static bloomThresholdBind: PipelineBind;
  private static bloomScaleBindLayout: PipelineBind["1"];
  private static currentMipLevel = 0;
  private static bindListOrder: PassOrderList[] = [
    ["x", "bloomThreshold", "bloomXPass", 0],
    ["y", "bloomXPass", "bloomYPass", 0],
    ["downscale", "bloomYPass", "bloomYPass", 0],

    ["x", "bloomYPass", "bloomXPass", 1],
    ["y", "bloomXPass", "bloomYPass", 1],
    ["downscale", "bloomYPass", "bloomYPass", 1],

    ["x", "bloomYPass", "bloomXPass", 2],
    ["y", "bloomXPass", "bloomYPass", 2],
    ["downscale", "bloomYPass", "bloomYPass", 2],

    ["x", "bloomYPass", "bloomXPass", 3],
    ["y", "bloomXPass", "bloomYPass", 3],
    ["upscale", "bloomYPass", "bloomYPass", 3],

    ["x", "bloomYPass", "bloomXPass", 2],
    ["y", "bloomXPass", "bloomYPass", 2],
    ["upscale", "bloomYPass", "bloomYPass", 2],

    ["x", "bloomYPass", "bloomXPass", 1],
    ["y", "bloomXPass", "bloomYPass", 1],
    ["upscale", "bloomYPass", "bloomYPass", 1],

    ["x", "bloomYPass", "bloomXPass", 0],
    ["y", "bloomXPass", "bloomYPass", 0],
  ];

  public static async createPipeline() {
    const bloomXShader = Aurora.createShader("bloomX", bloomX);
    const bloomYShader = Aurora.createShader("bloomY", bloomY);
    const downscaleShader = Aurora.createShader("downscale", downscale);
    const upscaleShader = Aurora.createShader("upscale", upscale);
    const thresholdShader = Aurora.createShader("threshold", threshold);

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
    this.bloomThresholdBind = Aurora.creteBindGroup({
      layout: {
        label: "bloomThreshBindLayout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d",
            },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
              access: "write-only",
              format: "rgba16float",
              viewDimension: "2d",
            },
          },
        ],
      },
      data: {
        label: "bloomThreshBindData",
        entries: [
          {
            binding: 0,
            resource: Batcher.getTextureView("offscreenCanvas"),
          },
          {
            binding: 1,
            resource: Batcher.getTextureView("bloomThreshold"),
          },
        ],
      },
    });

    const treshLayout = Aurora.createPipelineLayout([
      this.bloomThresholdBind[1],
    ]);
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
    this.thresholdPipeline = await Aurora.createComputePipeline({
      shader: thresholdShader,
      pipelineName: "bloomThresholdPassPipeline",
      pipelineLayout: treshLayout,
    });
  }

  public static usePipeline(): void {
    this.currentMipLevel = 0;
    this.thresholdPass();
    for (const instruction of this.bindListOrder) {
      const groupSize = this.getGroupSize(instruction);
      const passType = instruction[0];
      if (passType === "downscale") this.downscalePass(instruction, groupSize);
      else if (passType === "upscale") this.upscalePass(instruction, groupSize);
      else if (passType === "x" || passType === "y")
        this.blurPass(instruction, groupSize);
      else
        throw new Error(
          `BloomPipeline: no instruction with pass type: ${passType}`
        );
    }
    AuroraDebugInfo.accumulate("pipelineInUse", ["bloom"]);
  }

  private static thresholdPass() {
    const { meta } = Batcher.getTexture("offscreenCanvas");
    const size = {
      x: Math.ceil(meta.width / 8),
      y: Math.ceil(meta.height / 8),
    };
    const commandEncoder = Batcher.getEncoder;
    const passEncoderOne = commandEncoder.beginComputePass({
      label: "bloomThresholdPass",
    });
    passEncoderOne.setPipeline(this.thresholdPipeline);
    passEncoderOne.setBindGroup(0, this.bloomThresholdBind[0]);
    passEncoderOne.dispatchWorkgroups(size.x, size.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static downscalePass(passSet: PassOrderList, groupSize: Position2D) {
    const commandEncoder = Batcher.getEncoder;
    const currentBindData = this.getNewBinding(passSet);
    const passEncoderOne = commandEncoder.beginComputePass({
      label: "bloomComputePassDownscale",
    });
    passEncoderOne.setPipeline(this.downscalePipeline);
    passEncoderOne.setBindGroup(0, currentBindData);
    passEncoderOne.dispatchWorkgroups(groupSize.x, groupSize.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static blurPass(passSet: PassOrderList, groupSize: Position2D) {
    const passType = passSet[0];
    let pipeline: GPUComputePipeline;
    if (passType === "x") pipeline = this.pipelineX;
    else if (passType === "y") pipeline = this.pipelineY;
    else throw new Error(`Bloom pipeline should be X or Y. Got: ${passType}`);

    const commandEncoder = Batcher.getEncoder;
    const currentBindData = this.getNewBinding(passSet);
    const passEncoderOne = commandEncoder.beginComputePass({
      label: `bloomComputePassBlur${passType}`,
    });
    passEncoderOne.setPipeline(pipeline);
    passEncoderOne.setBindGroup(0, currentBindData);
    passEncoderOne.dispatchWorkgroups(groupSize.x, groupSize.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static upscalePass(passSet: PassOrderList, groupSize: Position2D) {
    const commandEncoder = Batcher.getEncoder;
    const currentBindData = this.getNewBinding(passSet);
    const passEncoderOne = commandEncoder.beginComputePass({
      label: "bloomComputePassUpscale",
    });
    passEncoderOne.setPipeline(this.upscalePipeline);
    passEncoderOne.setBindGroup(0, currentBindData);
    passEncoderOne.dispatchWorkgroups(groupSize.x, groupSize.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static getNewBinding(passSet: PassOrderList): GPUBindGroup {
    const sampler = Batcher.getSampler("linear");
    const passType = passSet[0];
    const label = `bloomPassBindData:${passType}`;
    let outputLevel = passSet[3];
    if (passType === "downscale") outputLevel = passSet[3] + 1;
    else if (passType === "upscale") outputLevel = passSet[3] - 1;
    const inputView = Batcher.getTextureView(passSet[1], passSet[3]);
    const outputView = Batcher.getTextureView(passSet[2], outputLevel);
    const bindEntries: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: inputView,
      },
      {
        binding: 1,
        resource: outputView,
      },
    ];
    if (passType === "downscale" || passType === "upscale")
      bindEntries.push({
        binding: 2,
        resource: sampler,
      });
    const bindData: CreateBindGroup["data"] = {
      entries: bindEntries,
      label: label,
    };
    const bindLayout =
      passType === "downscale" || passType === "upscale"
        ? this.bloomScaleBindLayout
        : this.bloomBindLayout;
    return Aurora.swapBindGroupData(bindData, bindLayout);
  }
  private static getGroupSize(passSet: PassOrderList) {
    const { meta } = Batcher.getTexture("bloomThreshold");
    const passType = passSet[0];
    const newMip = passSet[3];
    if (passType === "downscale") this.currentMipLevel = newMip + 1;
    else if (passType === "upscale") this.currentMipLevel = newMip - 1;
    else this.currentMipLevel = newMip;

    const width = Math.max(
      1,
      Math.floor(meta.width / (1 << this.currentMipLevel))
    );
    const height = Math.max(
      1,
      Math.floor(meta.height / (1 << this.currentMipLevel))
    );
    return {
      x: Math.ceil(width / 8),
      y: Math.ceil(height / 8),
    };
  }
}
