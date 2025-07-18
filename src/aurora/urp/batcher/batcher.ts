import Aurora from "../../core";
import AuroraCamera from "../camera";
import dummyTexture from "../assets/dummy.png";
import { GPUAuroraTexture, PipelineBind, RGB } from "../../aurora";
import generateFont, { FontGenProps } from "./fontGen";
import FontGen from "./fontGen";
import {
  clearTextureBuffer,
  generateInternalSamplers,
  generateInternalTextures,
} from "./textures";
import {
  clearPipelines,
  createPipelines,
  DRAW_PIPES,
  startPipelines,
} from "./pipes";
import jerseyImg from "../assets/Jersey25-Regular.png";
import jerseyJson from "../assets/Jersey25-Regular-msdf.json";
import latoImg from "../assets/Lato-Regular.png";
import latoJson from "../assets/Lato-Regular-msdf.json";
import { compileShaders } from "./shaders";
import AuroraDebugInfo from "../debugger/debugInfo";

export type BatcherOptions = {
  sortOrder: "none" | "y";
  textures: { name: string; url: string }[];
  fonts: FontGenProps[];
  drawOrigin: "center" | "topLeft";
  debugger: boolean;
  colorCorrection: RGB;
};

const INIT_OPTIONS: BatcherOptions = {
  sortOrder: "y",
  drawOrigin: "center",
  textures: [],
  fonts: [],
  debugger: true,
  colorCorrection: [255, 255, 255],
};
export default class Batcher {
  private static batcherOptions: BatcherOptions = structuredClone(INIT_OPTIONS);
  private static indexBuffer: GPUBuffer;
  private static userTextureBind: PipelineBind;
  private static userFontBind: PipelineBind;
  private static batcherOptionsBind: PipelineBind;
  public static pipelinesUsedInFrame: Set<keyof typeof DRAW_PIPES> = new Set();
  public static internatTextures: Map<string, GPUAuroraTexture> = new Map();
  public static loadedShaders: Map<string, GPUShaderModule> = new Map();
  public static internatSamplers: Map<string, GPUSampler> = new Map();
  private static userTexture: GPUAuroraTexture;
  private static userTextureIndexes: Map<string, number> = new Map();
  private static batchEncoder: GPUCommandEncoder;
  public static userFonts: Map<string, generateFont> = new Map();
  private static clearBuffer: GPUBuffer;
  public static async Initialize(options?: Partial<BatcherOptions>) {
    this.batcherOptions = { ...this.batcherOptions, ...options };

    if (this.batcherOptions.debugger) AuroraDebugInfo.setWorking(true);

    this.indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });
    this.clearBuffer = clearTextureBuffer();
    generateInternalTextures();
    generateInternalSamplers();
    compileShaders();
    AuroraCamera.initialize();
    this.createBatcherOptionsBind();
    await this.createUserTextureArray();
    await this.generateFonts();
    await createPipelines();
  }
  public static beginBatch() {
    this.batchEncoder = Aurora.device.createCommandEncoder();
    this.clearTextures();
    clearPipelines();
    AuroraCamera.update();
  }
  public static endBatch() {
    AuroraCamera.updateCameraBound();
    startPipelines();

    if (AuroraDebugInfo.isWorking) this.updateQuery();
    Aurora.device.queue.submit([this.getEncoder.finish()]);
    if (AuroraDebugInfo.isWorking) this.updateDebugData();
  }
  private static updateQuery() {
    const { qRead, qSet, qWrite } = AuroraDebugInfo.getQuery();
    this.batchEncoder.resolveQuerySet(qSet, 0, 2, qWrite, 0);
    if (qRead.mapState === "unmapped") {
      this.batchEncoder.copyBufferToBuffer(qWrite, 0, qRead, 0, qRead.size);
    }
  }

  private static updateDebugData() {
    const { qRead } = AuroraDebugInfo.getQuery();

    if (qRead.mapState === "unmapped") {
      qRead.mapAsync(GPUMapMode.READ).then(() => {
        const times = new BigInt64Array(qRead.getMappedRange());
        const time = Number(times[1] - times[0]);
        const gpuTime = Number((time / 1000 / 1000).toFixed(1));
        AuroraDebugInfo.update("GPUTime", gpuTime);
        qRead.unmap();
      });
    }
    const { drawnQuads, drawnLights, drawCalls, computeCalls } =
      AuroraDebugInfo.getAllData;
    AuroraDebugInfo.update("drawnTriangles", drawnQuads * 2 + drawnLights * 2);
    AuroraDebugInfo.update(
      "drawnVertices",
      drawnQuads * 2 * 6 + drawnLights * 2 * 6
    );
    AuroraDebugInfo.update("totalCalls", drawCalls + computeCalls);
  }
  private static async generateFonts() {
    this.batcherOptions.fonts.push({
      fontName: "lato",
      img: latoImg,
      json: latoJson,
    });
    this.batcherOptions.fonts.push({
      fontName: "jersey",
      img: jerseyImg,
      json: jerseyJson,
    });
    let index = 0;
    for (const { img, json, fontName } of this.batcherOptions.fonts) {
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
    this.userFontBind = Aurora.creteBindGroup({
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
          { binding: 0, resource: Batcher.getSampler("fontGen") },
          { binding: 1, resource: texture.texture.createView() },
        ],
        label: `font-array BindData`,
      },
    });
  }
  private static clearTexture(textureName: string) {
    const commandEncoder = this.batchEncoder;
    const { texture, meta } = this.getTexture(textureName);

    const bytesPerRow =
      Math.ceil(((meta.format === "bgra8unorm" ? 4 : 8) * meta.width) / 256) *
      256;

    commandEncoder.copyBufferToTexture(
      { buffer: this.clearBuffer, bytesPerRow: bytesPerRow },
      { texture: texture },
      {
        width: meta.width,
        height: meta.height,
        depthOrArrayLayers: meta.arrayTextureLength,
      }
    );
  }
  private static clearTextures() {
    const commandEncoder = this.batchEncoder;

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.getTextureView("offscreenCanvas"),
          clearValue: [0.5, 0.5, 0.5, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.getTextureView("depthTexture"),
        depthClearValue: 0.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
      timestampWrites: AuroraDebugInfo.isWorking
        ? {
            querySet: AuroraDebugInfo.getQuery().qSet,
            beginningOfPassWriteIndex: 0,
          }
        : undefined,
    });
    passEncoder.end();
    this.clearTexture("zBufferDump");
    this.clearTexture("bloomThreshold");
  }

  private static async createUserTextureArray() {
    let textures: BatcherOptions["textures"] = [];
    if (this.batcherOptions.textures.length === 0) {
      textures.push({ name: "colorRect", url: dummyTexture });
      textures.push({ name: "colorRectTwo", url: dummyTexture });
      this.userTextureIndexes.set("colorRectDummy", 0);
      this.userTextureIndexes.set("colorRectDummyOne", 1);
    } else {
      textures.push({ name: "colorRect", url: dummyTexture });
      this.userTextureIndexes.set("colorRectDummy", 0);
      this.batcherOptions.textures.forEach((texture, index) => {
        textures.push(texture);
        this.userTextureIndexes.set(texture.name, index + 1);
      });
    }
    this.userTexture = await Aurora.createTextureArray({
      label: "userTextures",
      textures: textures,
    });
    this.userTextureBind = Aurora.creteBindGroup({
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
          { binding: 1, resource: this.userTexture.texture.createView() },
        ],
      },
    });
  }
  private static createBatcherOptionsBind() {
    //tutaj mozesz dawac pozniej wszystkie potrzebne globalnie w gbpu dane jak ellapsedTime czy wlasnie opcje itp
    //zmienic wtedy z mapped na zwykle
    const isCenter = this.batcherOptions.drawOrigin == "center" ? 0 : 1;
    const zSort = this.batcherOptions.sortOrder == "none" ? 0 : 1;
    const optionsBindBuffer = Aurora.createMappedBuffer({
      bufferType: "uniform",
      data: [isCenter, zSort],
      dataType: "Uint32Array",
      label: "batcherOptionsBuffer",
    });
    this.batcherOptionsBind = Aurora.creteBindGroup({
      layout: {
        label: "batcherOptionsBindLayout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
          },
        ],
      },
      data: {
        label: "batcherOptionsBindData",
        entries: [
          {
            binding: 0,
            resource: { buffer: optionsBindBuffer },
          },
        ],
      },
    });
  }
  public static setColorCorrection(color: RGB) {
    this.batcherOptions.colorCorrection = color;
    if (AuroraDebugInfo.isWorking)
      AuroraDebugInfo.update("colorCorrection", color);
  }

  public static getTexture(name: string) {
    const texture = this.internatTextures.get(name);
    if (!texture) throw new Error(`no internal texture with name ${name}`);
    return texture;
  }
  public static getUserFontData(fontName: string) {
    const font = this.userFonts.get(fontName);
    if (!font) throw new Error(`there is no userFont with name ${fontName}`);
    return font;
  }
  public static getTextureView(name: string, mipLevel = 0) {
    const texture = this.internatTextures.get(name);
    if (!texture)
      throw new Error(
        `no internal texture with name ${texture} to create view from`
      );
    return texture.texture.createView({
      mipLevelCount: 1,
      baseMipLevel: mipLevel,
    });
  }
  public static getSampler(name: string) {
    const sampler = this.internatSamplers.get(name);
    if (!sampler) throw new Error(`No internal sampler with name ${name}`);
    return sampler;
  }
  public static getTextureIndex(name: string) {
    const texture = this.userTextureIndexes.get(name);
    if (!texture)
      console.warn(
        `WARNING: No texture with name ${name} present in Batcher! fallback to color`
      );
    return texture ?? 0;
  }
  public static get getColorCorrection() {
    return this.batcherOptions.colorCorrection;
  }
  public static get getNormalizedColorCorrection() {
    const color = this.batcherOptions.colorCorrection;
    return [color[0] / 255, color[1] / 255, color[2] / 255];
  }
  public static get getIndexBuffer() {
    return this.indexBuffer;
  }
  public static get getBatcherOptions() {
    return this.batcherOptions;
  }
  public static get getUserTextureBindGroup() {
    return this.userTextureBind[0];
  }

  public static get getUserTextureBindGroupLayout() {
    return this.userTextureBind[1];
  }
  public static get getUserFontBindGroup() {
    return this.userFontBind[0];
  }
  public static get getUserFontBindGroupLayout() {
    return this.userFontBind[1];
  }
  public static get getBatcherOptionsBindGroup() {
    return this.batcherOptionsBind[0];
  }
  public static get getBatcherOptionsGroupLayout() {
    return this.batcherOptionsBind[1];
  }
  public static get getEncoder() {
    return this.batchEncoder;
  }
  public static getShader(name: string) {
    const shader = this.loadedShaders.get(name);
    if (!shader) throw new Error(`No shader to load with name ${name}`);
    return shader;
  }
}
