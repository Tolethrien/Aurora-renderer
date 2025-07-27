import { GPUAuroraTexture, PipelineBind, RGB } from "../../aurora";
import AuroraCamera from "../camera";
import {
  compileShaders,
  generateInternalBuffers,
  generateInternalSamplers,
  generateInternalTextures,
} from "./generators";
import { AuroraConfig } from "./config";
import { assert } from "../../../utils/utils";
import Aurora from "../../core";
import FontGen from "./fontGen";
import SequentialDrawPipeline from "../pipelines/sequentialDraw";
import SortedDrawPipeline from "../pipelines/sortedDraw";
import LightsPipeline from "../pipelines/lights";
import BloomPipeline from "../pipelines/bloom";
import DebugTexturePipeline from "../pipelines/debugTexture";
import PresentationPipeline from "../pipelines/presentation";
import AuroraDebugInfo from "../debugger/debugInfo";

interface PipelineStaticClass {
  usePipeline(): void;
  clearPipeline(): void;
  createPipeline(): void;
}
interface SceneData {
  globalIllumination: RGB;
}
type DrawPipeline = typeof SortedDrawPipeline | typeof SequentialDrawPipeline;
export default class Renderer {
  private static auroraConfig: AuroraConfig;
  private static buffers: Map<string, GPUBuffer>;
  private static textures: Map<string, GPUAuroraTexture>;
  private static userTextureIndexes: Map<string, number> = new Map();
  private static samplers: Map<string, GPUSampler>;
  private static shaders: Map<string, GPUShaderModule>;
  private static globalBindGroups: Map<string, PipelineBind> = new Map();
  private static userFonts: Map<string, FontGen> = new Map();
  private static pipelineOrder: PipelineStaticClass[] = [];
  private static frameEncoder: GPUCommandEncoder;
  public static pipelinesUsedInFrame: Set<string> = new Set();
  private static sceneData: SceneData = {
    globalIllumination: [255, 255, 255],
  };
  public static async initialize(config: AuroraConfig) {
    this.auroraConfig = config;

    if (this.auroraConfig.debugger !== "none") AuroraDebugInfo.setWorking(true);

    this.buffers = generateInternalBuffers();
    this.generateGlobalBindGroups();
    this.textures = generateInternalTextures();
    this.samplers = generateInternalSamplers();
    this.shaders = compileShaders();
    await this.uploadUserTextures();
    await this.uploadFonts();
    this.setPipelineOrder();
    const cameraBind = AuroraCamera.initialize(this.auroraConfig.camera);
    this.globalBindGroups.set("camera", cameraBind);
    AuroraCamera.update(this.getBuffer("cameraMatrix"));
    await this.createPipelines();
  }
  public static beginBatch() {
    this.frameEncoder = Aurora.device.createCommandEncoder();
    this.clearPipelines();
    AuroraCamera.update(this.getBuffer("cameraMatrix"));
  }
  public static endBatch() {
    AuroraCamera.updateCameraBound(this.getBuffer("cameraBounds"));
    this.startPipelines();

    const debugOn = AuroraDebugInfo.isWorking;
    if (debugOn) this.updateQuery();
    Aurora.device.queue.submit([this.frameEncoder.finish()]);
    if (debugOn) this.updateDebugData();
  }

  private static setPipelineOrder() {
    const config = this.auroraConfig;
    const drawPipeline =
      config.rendering.sortOrder === "none"
        ? SequentialDrawPipeline
        : SortedDrawPipeline;
    this.pipelineOrder.push(drawPipeline);
    if (config.feature.lighting) this.pipelineOrder.push(LightsPipeline);
    if (config.feature.bloom) this.pipelineOrder.push(BloomPipeline);

    if (config.debugger) this.pipelineOrder.push(DebugTexturePipeline);
    else this.pipelineOrder.push(PresentationPipeline);
  }

  private static clearPipelines() {
    this.pipelineOrder.forEach((pipeline) => pipeline.clearPipeline());
  }
  private static startPipelines() {
    this.pipelineOrder.forEach((pipeline) => pipeline.usePipeline());
  }
  private static async createPipelines() {
    try {
      await Promise.all(
        this.pipelineOrder.map((pipe) => pipe.createPipeline())
      );
    } catch (error) {
      throw new Error(`error while creating pipelines: ${error}`);
    }
  }

  private static async uploadUserTextures() {
    this.auroraConfig.userTextures.forEach((texture, index) => {
      this.userTextureIndexes.set(texture.name, index + 1);
    });
    const userTexture = await Aurora.createTextureArray({
      label: "userTextures",
      textures: this.auroraConfig.userTextures,
    });
    this.textures.set("userTexture", userTexture);
    const userTextureBind = Aurora.creteBindGroup({
      layout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
            sampler: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
            texture: { viewDimension: "2d-array" },
          },
        ],
        label: "userTextureBindLayout",
      },
      data: {
        label: "userTextureBindData",
        entries: [
          { binding: 0, resource: this.getSampler("universal") },
          { binding: 1, resource: userTexture.texture.createView() },
        ],
      },
    });
    this.globalBindGroups.set("userTextures", userTextureBind);
  }
  private static async uploadFonts() {
    let index = 0;
    for (const { img, json, fontName } of this.auroraConfig.userFonts) {
      const font = await FontGen.generateFont({
        fontName,
        img,
        json,
        index,
      });
      this.userFonts.set(fontName, font);
      index++;
    }
    const textures = Array.from(this.userFonts.values()).map((text) => {
      const data = text.getFontGenerationInfo;
      return {
        url: data.imgUrl,
        name: data.name,
      };
    });
    const texture = await Aurora.createTextureArray({
      label: `MSDF font texture array`,
      format: "rgba8unorm",
      textures: textures,
    });
    const FontBind = Aurora.creteBindGroup({
      layout: {
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d-array" },
          },
        ],
        label: `font-array BindLayout`,
      },
      data: {
        entries: [
          { binding: 0, resource: this.getSampler("fontGen") },
          { binding: 1, resource: texture.texture.createView() },
        ],
        label: `font-array BindData`,
      },
    });
    this.globalBindGroups.set("fonts", FontBind);
  }
  private static updateQuery() {
    const { qRead, qSet, qWrite } = AuroraDebugInfo.getQuery();
    this.frameEncoder.resolveQuerySet(qSet, 0, 2, qWrite, 0);
    if (qRead.mapState === "unmapped") {
      this.frameEncoder.copyBufferToBuffer(qWrite, 0, qRead, 0, qRead.size);
    }
  }
  private static updateDebugData() {
    const { qRead } = AuroraDebugInfo.getQuery();

    if (qRead.mapState === "unmapped") {
      qRead.mapAsync(GPUMapMode.READ).then(() => {
        const times = new BigInt64Array(qRead.getMappedRange());
        const time = Number(times[1] - times[0]);
        const gpuTime = Number((time / 1000 / 1000).toFixed(1));
        AuroraDebugInfo.setParam("GPUTime", gpuTime);
        qRead.unmap();
      });
    }
    const { drawnQuads, drawnLights, drawCalls, computeCalls } =
      AuroraDebugInfo.getAllData;
    AuroraDebugInfo.setParam(
      "drawnTriangles",
      drawnQuads * 2 + drawnLights * 2
    );
    AuroraDebugInfo.setParam(
      "drawnVertices",
      drawnQuads * 2 * 6 + drawnLights * 2 * 6
    );
    AuroraDebugInfo.setParam("totalCalls", drawCalls + computeCalls);
  }
  private static generateGlobalBindGroups() {
    //TODO: to przerobic, dodac tonemap do uniwersalnego i usunac ta funkcje
    const bloomParamsUniform = Aurora.creteBindGroup({
      layout: {
        label: "BloomParamsBindLayout",
        entries: [
          {
            binding: 0,
            buffer: { type: "uniform" },
            visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          },
        ],
      },
      data: {
        label: "BloomParamsBindData",
        entries: [
          {
            binding: 0,
            resource: { buffer: this.getBuffer("bloomParams") },
          },
        ],
      },
    });
    this.globalBindGroups.set("bloomParams", bloomParamsUniform);
  }
  public static getBuffer(name: string) {
    const buffer = this.buffers.get(name);
    assert(buffer !== undefined, this.showNotFoundInMapError(name, "buffer"));
    return buffer;
  }
  public static getSampler(name: string) {
    const sampler = this.samplers.get(name);
    assert(sampler !== undefined, this.showNotFoundInMapError(name, "sampler"));
    return sampler;
  }
  public static getShader(name: string) {
    const shader = this.shaders.get(name);
    assert(shader !== undefined, this.showNotFoundInMapError(name, "shader"));
    return shader;
  }
  public static getBind(name: string) {
    const bind = this.globalBindGroups.get(name);
    assert(bind !== undefined, this.showNotFoundInMapError(name, "bind"));
    return bind;
  }
  public static getTexture(name: string) {
    const texture = this.textures.get(name);
    assert(texture !== undefined, this.showNotFoundInMapError(name, "texture"));
    return texture;
  }
  public static getTextureView(name: string, mipLevel = 0) {
    const texture = this.textures.get(name);
    assert(texture !== undefined, this.showNotFoundInMapError(name, "texture"));

    return texture.texture.createView({
      mipLevelCount: 1,
      baseMipLevel: mipLevel,
    });
  }
  public static get getEncoder() {
    return this.frameEncoder;
  }
  public static getTextureIndex(name: string) {
    const texture = this.userTextureIndexes.get(name);

    if (!texture)
      console.warn(
        `WARNING: No texture with name ${name} present in Batcher! fallback to color`
      );
    return texture ?? 0;
  }
  public static getUserFontData(fontName: string) {
    const font = this.userFonts.get(fontName);
    assert(font !== undefined, `there is no userFont with name ${fontName}`);
    return font;
  }
  public static getDrawPipeline() {
    return this.pipelineOrder[0] as DrawPipeline;
  }
  public static getGlobalIllumination(type: "fullRange" | "normalized"): RGB {
    const luna = this.sceneData.globalIllumination;
    return type === "fullRange"
      ? luna
      : [luna[0] / 255, luna[1] / 255, luna[2] / 255];
  }

  public static setGlobalIllumination(color: RGB) {
    this.sceneData.globalIllumination = color;
  }
  public static get getAllConfig() {
    return this.auroraConfig;
  }
  public static getConfigGroup<T extends keyof AuroraConfig>(option: T) {
    return this.auroraConfig[option];
  }

  private static showNotFoundInMapError(name: string, mapType: string) {
    return `trying access ${mapType} ${name}, but ${mapType} with this name not exist`;
  }
}
