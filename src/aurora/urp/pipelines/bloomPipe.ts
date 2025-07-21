import { CreateBindGroup, PipelineBind, Position2D } from "../../aurora";
import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraDebugInfo from "../debugger/debugInfo";
import bloomX from "../shaders/bloomX.wgsl?raw";
import bloomY from "../shaders/bloomY.wgsl?raw";
import downscale from "../shaders/downscaling.wgsl?raw";
import upscale from "../shaders/upscaleAndBlend.wgsl?raw";
import threshold from "../shaders/bloomThreshold.wgsl?raw";
//TODO: optimize pass amount and then change generate
//TODO: threshold can blurX
//TODO: bloomY can downscale
//TODO: change arr of arr list
type TexturePassType =
  | "bloomXPass"
  | "bloomYPass"
  | "bloomThreshold"
  | "bloomUpscalePass";
type PassType = "x" | "y" | "upscale" | "downscale";
type MipMapLevelToUse = number;
type PassOrderList = [
  PassType,
  TexturePassType,
  TexturePassType,
  MipMapLevelToUse
];
enum BloomParamsEnum {
  toneMapping = 0, // 0 - rainhard, 1-ACES
  threshold = 1,
  thresholdSoftness = 2,
  bloomIntense = 3,
}
/**
 * HDR bloom 2 pass gaussian blur pipeline
 */
export default class BloomPipeline {
  private static GROUP_SIZE = 8;
  private static pipelineX: GPUComputePipeline;
  private static pipelineY: GPUComputePipeline;
  private static downscalePipeline: GPUComputePipeline;
  private static upscalePipeline: GPUComputePipeline;
  private static thresholdPipeline: GPUComputePipeline;

  private static bloomBlurBindLayout: PipelineBind["1"];
  private static bloomThresholdBind: PipelineBind;
  private static bloomUpscaleBindLayout: PipelineBind["1"];
  private static bloomDownscaleBindLayout: PipelineBind["1"];
  private static bindList: GPUBindGroup[] = [];
  private static currentMipLevel = 0;
  public static bloomInFrame: boolean = false;
  public static bloomParams = new Float32Array([1, 1, 0.1, 0.7]); // see enum
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

    ["upscale", "bloomXPass", "bloomXPass", 3],
    ["upscale", "bloomXPass", "bloomXPass", 2],
    ["upscale", "bloomXPass", "bloomXPass", 1],
  ];

  public static async createPipeline() {
    const bloomXShader = Aurora.createShader("bloomX", bloomX);
    const bloomYShader = Aurora.createShader("bloomY", bloomY);
    const downscaleShader = Aurora.createShader("downscale", downscale);
    const upscaleShader = Aurora.createShader("upscale", upscale);
    const thresholdShader = Aurora.createShader("threshold", threshold);

    this.bloomBlurBindLayout = Aurora.creteBindLayout({
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
    this.bloomDownscaleBindLayout = Aurora.creteBindLayout({
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
    this.bloomUpscaleBindLayout = Aurora.creteBindLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          texture: { viewDimension: "2d", sampleType: "float" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            viewDimension: "2d",
            access: "write-only",
            format: "rgba16float",
          },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          sampler: { type: "filtering" },
        },
      ],
      label: "bloomPassDownscaleBindLayout",
    });
    this.bloomThresholdBind = Aurora.creteBindGroup({
      layout: {
        label: "bloomThreshBindLayout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            texture: {
              sampleType: "float",
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
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            sampler: { type: "filtering" },
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
          {
            binding: 2,
            resource: Batcher.getSampler("linear"),
          },
        ],
      },
    });
    const bloomLayout = Batcher.getBloomParamUniformLayout;
    const treshLayout = Aurora.createPipelineLayout([
      this.bloomThresholdBind[1],
      bloomLayout,
    ]);
    const pipelineBlurLayout = Aurora.createPipelineLayout([
      this.bloomBlurBindLayout,
    ]);
    const pipelineUpScaleLayout = Aurora.createPipelineLayout([
      this.bloomUpscaleBindLayout,
      bloomLayout,
    ]);
    const pipelineDownscaleLayout = Aurora.createPipelineLayout([
      this.bloomDownscaleBindLayout,
    ]);
    this.pipelineX = await Aurora.createComputePipeline({
      shader: bloomXShader,
      pipelineName: "bloomXPassPipeline",
      pipelineLayout: pipelineBlurLayout,
      consts: {
        workgroupSize: this.GROUP_SIZE,
      },
    });
    this.pipelineY = await Aurora.createComputePipeline({
      shader: bloomYShader,
      pipelineName: "bloomYPassPipeline",
      pipelineLayout: pipelineBlurLayout,
      consts: {
        workgroupSize: this.GROUP_SIZE,
      },
    });
    this.downscalePipeline = await Aurora.createComputePipeline({
      shader: downscaleShader,
      pipelineName: "bloomScalePassPipeline",
      pipelineLayout: pipelineDownscaleLayout,
      consts: {
        workgroupSize: this.GROUP_SIZE,
      },
    });
    this.upscalePipeline = await Aurora.createComputePipeline({
      shader: upscaleShader,
      pipelineName: "bloomScalePassPipeline",
      pipelineLayout: pipelineUpScaleLayout,
      consts: {
        workgroupSize: this.GROUP_SIZE,
      },
    });
    this.thresholdPipeline = await Aurora.createComputePipeline({
      shader: thresholdShader,
      pipelineName: "bloomThresholdPassPipeline",
      pipelineLayout: treshLayout,
      consts: {
        workgroupSize: this.GROUP_SIZE,
      },
    });
    this.generateBindGroups();
  }

  public static usePipeline(): void {
    if (!this.bloomInFrame) return;
    this.currentMipLevel = 0;
    this.thresholdPass();
    const bloomParamBuffer = Batcher.getBloomParamBuffer;
    Aurora.device.queue.writeBuffer(bloomParamBuffer, 0, this.bloomParams, 0);
    this.bindListOrder.forEach((instruction, index) => {
      const groupSize = this.getGroupSize(instruction);
      const passType = instruction[0];
      if (passType === "downscale") this.downscalePass(groupSize, index);
      else if (passType === "upscale") this.upscalePass(groupSize, index);
      else if (passType === "x" || passType === "y")
        this.blurPass(instruction[0], groupSize, index);
      else
        throw new Error(
          `BloomPipeline: no instruction with pass type: ${passType}`
        );
    });
    AuroraDebugInfo.accumulate("pipelineInUse", ["bloom"]);
  }
  public static clearBatch() {
    this.bloomInFrame = false;
  }
  public static setBloomParam(
    param: keyof typeof BloomParamsEnum,
    value: number
  ) {
    const key = BloomParamsEnum[param];
    this.bloomParams[key] = value;
  }
  private static thresholdPass() {
    const { meta } = Batcher.getTexture("bloomThreshold");
    const size = {
      x: Math.ceil(meta.width / this.GROUP_SIZE),
      y: Math.ceil(meta.height / this.GROUP_SIZE),
    };
    const bloomParams = Batcher.getBloomParamUniform;
    const commandEncoder = Batcher.getEncoder;
    const passEncoderOne = commandEncoder.beginComputePass({
      label: "bloomThresholdPass",
    });
    passEncoderOne.setPipeline(this.thresholdPipeline);
    passEncoderOne.setBindGroup(0, this.bloomThresholdBind[0]);
    passEncoderOne.setBindGroup(1, bloomParams);
    passEncoderOne.dispatchWorkgroups(size.x, size.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static downscalePass(groupSize: Position2D, index: number) {
    const commandEncoder = Batcher.getEncoder;
    const currentBindData = this.bindList[index];
    const passEncoderOne = commandEncoder.beginComputePass({
      label: "bloomComputePassDownscale",
    });
    passEncoderOne.setPipeline(this.downscalePipeline);
    passEncoderOne.setBindGroup(0, currentBindData);
    passEncoderOne.dispatchWorkgroups(groupSize.x, groupSize.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static blurPass(
    blurPass: PassType,
    groupSize: Position2D,
    index: number
  ) {
    let pipeline: GPUComputePipeline;
    if (blurPass === "x") pipeline = this.pipelineX;
    else if (blurPass === "y") pipeline = this.pipelineY;
    else throw new Error(`Bloom pipeline should be X or Y. Got: ${blurPass}`);

    const commandEncoder = Batcher.getEncoder;
    const currentBindData = this.bindList[index];

    const passEncoderOne = commandEncoder.beginComputePass({
      label: `bloomComputePassBlur${blurPass}`,
    });
    passEncoderOne.setPipeline(pipeline);
    passEncoderOne.setBindGroup(0, currentBindData);
    passEncoderOne.dispatchWorkgroups(groupSize.x, groupSize.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }
  private static upscalePass(groupSize: Position2D, index: number) {
    const commandEncoder = Batcher.getEncoder;
    const currentBindData = this.bindList[index];
    const bloomParams = Batcher.getBloomParamUniform;

    const passEncoderOne = commandEncoder.beginComputePass({
      label: "bloomComputePassUpscale",
    });
    passEncoderOne.setPipeline(this.upscalePipeline);
    passEncoderOne.setBindGroup(0, currentBindData);
    passEncoderOne.setBindGroup(1, bloomParams);
    passEncoderOne.dispatchWorkgroups(groupSize.x, groupSize.y);
    passEncoderOne.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
  }

  private static getBindLayout(passType: PassType) {
    if (passType === "x" || passType === "y") return this.bloomBlurBindLayout;
    else if (passType === "downscale") return this.bloomDownscaleBindLayout;
    else if (passType === "upscale") return this.bloomUpscaleBindLayout;
    else
      throw new Error(
        `Bloom bind layout type should be [x,y,upscale,downscale]. Got: ${passType}`
      );
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
      x: Math.ceil(width / this.GROUP_SIZE),
      y: Math.ceil(height / this.GROUP_SIZE),
    };
  }
  private static getNewBinding(passSet: PassOrderList): GPUBindGroup {
    const sampler = Batcher.getSampler("linear");
    const passType = passSet[0];
    const label = `bloomPassBindData:${passType}`;
    let outputLevel = passSet[3];
    if (passType === "downscale") outputLevel = passSet[3] + 1;
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
    if (passType === "downscale")
      bindEntries.push({
        binding: 2,
        resource: sampler,
      });
    const bindData: CreateBindGroup["data"] = {
      entries: bindEntries,
      label: label,
    };
    const bindLayout = this.getBindLayout(passType);
    return Aurora.getNewBindGroupFromLayout(bindData, bindLayout);
  }
  private static getNewUpscaleBinding(passSet: PassOrderList): GPUBindGroup {
    const sampler = Batcher.getSampler("linear");
    const label = "bloomPassBindData:UpscaleAndBlend";
    const lowerResInputTexture = passSet[1];
    const outputTexture = passSet[2];
    const lowerResMipLevel = passSet[3];
    const outputMipLevel = lowerResMipLevel - 1;
    const lowerResView = Batcher.getTextureView(
      lowerResInputTexture,
      lowerResMipLevel
    );
    const currentLevelView = Batcher.getTextureView(
      "bloomYPass",
      outputMipLevel
    );

    const outputView = Batcher.getTextureView(outputTexture, outputMipLevel);
    const bindData: CreateBindGroup["data"] = {
      entries: [
        {
          binding: 0,
          resource: lowerResView,
        },
        {
          binding: 1,
          resource: currentLevelView,
        },
        {
          binding: 2,
          resource: outputView,
        },
        {
          binding: 3,
          resource: sampler,
        },
      ],
      label: label,
    };
    const bindLayout = this.getBindLayout("upscale");
    return Aurora.getNewBindGroupFromLayout(bindData, bindLayout);
  }
  private static generateBindGroups() {
    for (let i = 0; i <= 10; i++) {
      this.bindList.push(this.getNewBinding(this.bindListOrder[i]));
    }
    for (let i = 11; i <= 13; i++) {
      this.bindList.push(this.getNewUpscaleBinding(this.bindListOrder[i]));
    }
  }
}
