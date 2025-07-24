import Aurora from "../../core";
import AuroraCamera from "../camera";
import { GPUAuroraTexture, PipelineBind, RGB } from "../../aurora";
import generateFont from "./fontGen";
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

import { compileShaders } from "./shaders";
import AuroraDebugInfo from "../debugger/debugInfo";
import { AuroraConfig } from "./config";

export default class Batcher {
  private static auroraConfig: AuroraConfig;
  private static indexBuffer: GPUBuffer;
  private static bloomParamsBuffer: GPUBuffer;

  private static userTextureBind: PipelineBind;
  private static userFontBind: PipelineBind;
  private static batcherOptionsBind: PipelineBind;
  private static bloomParamsUniform: PipelineBind;
  public static pipelinesUsedInFrame: Set<keyof typeof DRAW_PIPES> = new Set();
  public static internatTextures: Map<string, GPUAuroraTexture> = new Map();
  public static loadedShaders: Map<string, GPUShaderModule> = new Map();
  public static internatSamplers: Map<string, GPUSampler> = new Map();
  private static userTexture: GPUAuroraTexture;
  private static userTextureIndexes: Map<string, number> = new Map();
  private static batchEncoder: GPUCommandEncoder;
  public static userFonts: Map<string, generateFont> = new Map();
  private static clearBuffer: GPUBuffer;
  public static async Initialize(config: AuroraConfig) {
    this.auroraConfig = config;

    if (this.auroraConfig.debugger !== "none") AuroraDebugInfo.setWorking(true);

    this.indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });
    this.clearBuffer = clearTextureBuffer();

    this.createBloomBuffer();
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
  private static createBloomBuffer() {
    this.bloomParamsBuffer = Aurora.createBuffer({
      bufferType: "uniform",
      dataLength: 4,
      dataType: "Float32Array",
      label: "bloomParamsBuffer",
    });
    this.bloomParamsUniform = Aurora.creteBindGroup({
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
            resource: { buffer: this.bloomParamsBuffer },
          },
        ],
      },
    });
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
    this.auroraConfig.userTextures.forEach((texture, index) => {
      this.userTextureIndexes.set(texture.name, index + 1);
    });
    this.userTexture = await Aurora.createTextureArray({
      label: "userTextures",
      textures: this.auroraConfig.userTextures,
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
    const isCenter = this.auroraConfig.rendering.drawOrigin == "center" ? 0 : 1;
    const zSort = this.auroraConfig.rendering.sortOrder == "none" ? 0 : 1;

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
    this.auroraConfig.screen.colorCorrection = color;
    if (AuroraDebugInfo.isWorking)
      AuroraDebugInfo.update("colorCorrection", color);
  }
  public static getConfigGroup<T extends keyof AuroraConfig>(option: T) {
    return this.auroraConfig[option];
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
    return this.auroraConfig.screen.colorCorrection;
  }
  public static get getNormalizedColorCorrection() {
    const color = this.auroraConfig.screen.colorCorrection;
    return [color[0] / 255, color[1] / 255, color[2] / 255];
  }
  public static get getIndexBuffer() {
    return this.indexBuffer;
  }
  public static get getAllConfig() {
    return this.auroraConfig;
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
  //TODO: przerobic to na zwykle [data,layout] = getBind()
  public static get getBatcherOptionsBindGroup() {
    return this.batcherOptionsBind[0];
  }
  public static get getBatcherOptionsGroupLayout() {
    return this.batcherOptionsBind[1];
  }
  public static get getEncoder() {
    return this.batchEncoder;
  }
  public static get getBloomParamBuffer() {
    return this.bloomParamsBuffer;
  }
  public static get getBloomParamUniform() {
    return this.bloomParamsUniform[0];
  }
  public static get getBloomParamUniformLayout() {
    return this.bloomParamsUniform[1];
  }
  public static getShader(name: string) {
    const shader = this.loadedShaders.get(name);
    if (!shader) throw new Error(`No shader to load with name ${name}`);
    return shader;
  }
}
