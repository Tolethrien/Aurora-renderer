import Aurora from "../../core";
import AuroraCamera from "../camera";
import dummyTexture from "../assets/dummy.png";
import { GPUAuroraTexture, PipelineBind } from "../../aurora";
import generateFont, { FontGenProps } from "./fontGen";
import FontGen from "./fontGen";
import { generateInternalSamplers, generateInternalTextures } from "./textures";
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
export type BatcherOptions = {
  zBuffer: "none" | "y" | "y-x";
  textures: { name: string; url: string }[];
  fonts: FontGenProps[];
  drawOrigin: "center" | "topLeft";
};

const INIT_OPTIONS: BatcherOptions = {
  zBuffer: "y",
  drawOrigin: "center",
  textures: [],
  fonts: [],
};

export default class Batcher {
  private static batcherOptions: BatcherOptions = structuredClone(INIT_OPTIONS);
  private static indexBuffer: GPUBuffer;
  private static userTextureBind: PipelineBind;
  private static userFontBind: PipelineBind;
  private static batcherOptionsBind: PipelineBind;
  public static pipelinesUsedInFrame: Set<keyof typeof DRAW_PIPES> = new Set();
  public static internatTextures: Map<string, GPUAuroraTexture> = new Map();
  public static internatSamplers: Map<string, GPUSampler> = new Map();
  private static userTexture: GPUAuroraTexture;
  private static userTextureIndexes: Map<string, number> = new Map();

  public static userFonts: Map<string, generateFont> = new Map();

  public static async Initialize(options?: Partial<BatcherOptions>) {
    this.batcherOptions = { ...this.batcherOptions, ...options };
    console.log(this.batcherOptions);
    this.indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });

    generateInternalTextures();
    generateInternalSamplers();
    AuroraCamera.initialize();
    this.createBatcherOptionsBind();
    await this.createUserTextureArray();
    await this.generateFonts();

    await createPipelines();
  }
  public static beginBatch() {
    this.clearTextures();
    clearPipelines();
    AuroraCamera.update();
  }
  public static endBatch() {
    AuroraCamera.updateCameraBound();
    console.log(this.pipelinesUsedInFrame);
    startPipelines();
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
    console.log(texture.meta);
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
  private static clearTextures() {
    const commandEncoder = Aurora.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.getTextureView("offscreenCanvas"),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
        {
          view: this.getTextureView("depthAccumulativeTexture"),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
        {
          view: this.getTextureView("depthRevealableTexture"),
          clearValue: { r: 1, g: 1, b: 1, a: 1 },
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
    });
    passEncoder.end();
    Aurora.device.queue.submit([commandEncoder.finish()]);
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
    console.log(isCenter);
    const optionsBindBuffer = Aurora.createMappedBuffer({
      bufferType: "uniform",
      data: [isCenter],
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
  public static getTexture(name: string) {
    const texture = this.internatTextures.get(name);
    if (!texture) throw new Error(`no internal texture with name ${texture}`);
    return texture;
  }
  public static getUserFontData(fontName: string) {
    const font = this.userFonts.get(fontName);
    if (!font) throw new Error(`there is no userFont with name ${fontName}`);
    return font;
  }
  public static getTextureView(name: string) {
    const texture = this.internatTextures.get(name);
    if (!texture)
      throw new Error(
        `no internal texture with name ${texture} to create view from`
      );
    return texture.texture.createView();
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
  public static get getIndexBuffer() {
    return this.indexBuffer;
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
}
