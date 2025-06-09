import { assert } from "../../utils/utils";
import Aurora from "../core";
import AuroraCamera from "./camera";
import ShapePipe from "./pipelines/shapePipe";
import SpritePipe from "./pipelines/spritePipe";
import dummyTexture from "./assets/dummy.png";
import { GPUAuroraTexture, HSLA } from "../aurora";
import screenQuadShader from "./shaders/screenQuad.wgsl?raw";
import WBOITPipe from "./pipelines/WBOITPipe";
import TextPipe from "./pipelines/textPipe";
import generateFont, { FontData } from "./msdf/generateFont";
import ftex from "../../helps/mdfs/assets/ya-hei-ascii.png";
import fjson from "../../helps/mdfs/assets/ya-hei-ascii-msdf.json";
import Text2Pipe from "./msdf/tempPipe";
import PresentationPipe from "./pipelines/presentationPipe";
export interface Pipeline {
  usePipeline: () => void;
  createPipeline: () => void;
  clearBatch: () => void;
}
export type BatcherOptions = {
  customCamera: boolean;
  zBuffer: "none" | "y" | "y-x";
  textures: { name: string; url: string }[];
};
type PostProcess = "grayscale";
export type BatcherStats = {
  drawCalls: number;
  computeCalls: number;
  usedPipelines: (keyof typeof PIPELINES)[];
  totalBatches: number;
  pointLights: number;
  colorCorrection: HSLA;
  appliedPostProcessing: PostProcess[];
};
const INIT_STATS: BatcherStats = {
  drawCalls: 0,
  computeCalls: 0,
  usedPipelines: [],
  pointLights: 0,
  totalBatches: 0,
  colorCorrection: [255, 255, 255, 255],
  appliedPostProcessing: [],
};
const INIT_OPTIONS: BatcherOptions = {
  customCamera: false,
  zBuffer: "y",
  textures: [],
};
const PIPELINES = {
  shape: ShapePipe,
  // text: TextPipe,
  // sprite: SpritePipe,
};
export type PipelineBind = [GPUBindGroup, GPUBindGroupLayout];
export default class Batcher {
  private static batcherOptions: BatcherOptions = structuredClone(INIT_OPTIONS);
  private static batcherStats: BatcherStats = structuredClone(INIT_STATS);
  private static indexBuffer: GPUBuffer;
  private static buildInCameraBind: PipelineBind | undefined;
  private static userTextureBind: PipelineBind;
  private static buildInCameraBuffer: GPUBuffer;
  private static buildInCameraBoundBuffer: GPUBuffer;
  public static pipelinesUsedInFrame: Set<keyof typeof PIPELINES> = new Set();
  private static userTexture: GPUAuroraTexture;
  public static offscreenCanvas: GPUAuroraTexture;
  public static depthTexture: GPUAuroraTexture;
  public static depthAccumulativeTexture: GPUAuroraTexture;
  public static depthRevealableTexture: GPUAuroraTexture;
  private static userTextureIndexes: Map<string, number> = new Map();
  public static universalSampler: GPUSampler;
  private static cameraBounds = new Float32Array([0, 0]);
  public static textData: generateFont;
  public static async Initialize(options?: Partial<BatcherOptions>) {
    this.batcherOptions = { ...this.batcherOptions, ...options };
    this.indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });

    if (this.batcherOptions.zBuffer !== "none") this.createDepthTexture();
    this.universalSampler = Aurora.createSampler();
    await this.createUserTextureArray();
    if (!this.batcherOptions.customCamera) this.createBuildInCamera();
    this.textData = new generateFont({
      fontName: "sds",
      img: ftex,
      json: fjson,
    });
    await this.textData.generateFont();
    console.log(this.textData.getMeta);
    Object.values(PIPELINES).forEach((pipeline) => pipeline.createPipeline());
    WBOITPipe.createPipeline();
    PresentationPipe.createPipeline();
  }

  public static beginBatch() {
    this.clearTextures();
    this.pipelinesUsedInFrame.forEach((name) => PIPELINES[name].clearBatch());
    this.pipelinesUsedInFrame.clear();
    AuroraCamera.update();
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBuffer,
      0,
      AuroraCamera.getProjectionViewMatrix.getMatrix
    );
  }
  public static endBatch() {
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBoundBuffer,
      0,
      this.cameraBounds
    );
    console.log(this.pipelinesUsedInFrame);
    this.pipelinesUsedInFrame.forEach((name) =>
      PIPELINES[name].usePipeline("opaque")
    );
    this.pipelinesUsedInFrame.forEach((name) =>
      PIPELINES[name].usePipeline("transparent")
    );
    WBOITPipe.usePipeline();
    PresentationPipe.usePipeline();
  }
  public static updateCameraBound(value: number) {
    this.cameraBounds[0] = Math.min(this.cameraBounds[0], value);
    this.cameraBounds[1] = Math.max(this.cameraBounds[1], value);
  }

  private static clearTextures() {
    const commandEncoder = Aurora.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.offscreenCanvas.texture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
        {
          view: this.depthAccumulativeTexture.texture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
        {
          view: this.depthRevealableTexture.texture.createView(),
          clearValue: { r: 1, g: 1, b: 1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.texture.createView(),
        depthClearValue: 0.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    passEncoder.end();
    Aurora.device.queue.submit([commandEncoder.finish()]);
  }
  // private static
  private static createBuildInCamera() {
    AuroraCamera.initialize();
    AuroraCamera.update();

    this.buildInCameraBuffer = Aurora.createBuffer({
      bufferType: "uniform",
      dataType: "Float32Array",
      dataLength: 16,
      label: "CameraBuffer",
    });
    this.buildInCameraBoundBuffer = Aurora.createBuffer({
      bufferType: "uniform",
      dataType: "Float32Array",
      dataLength: 2,
      label: "CameraBufferBound",
    });

    Aurora.device.queue.writeBuffer(
      this.buildInCameraBuffer,
      0,
      AuroraCamera.getProjectionViewMatrix.getMatrix
    );
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBoundBuffer,
      0,
      this.cameraBounds
    );
    this.buildInCameraBind = Aurora.creteBindGroup({
      layout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
          },
        ],
        label: "cameraBindLayout",
      },
      data: {
        label: "cameraBindData",
        entries: [
          { binding: 0, resource: { buffer: this.buildInCameraBuffer } },
          { binding: 1, resource: { buffer: this.buildInCameraBoundBuffer } },
        ],
      },
    });
  }
  private static createDepthTexture() {
    this.offscreenCanvas = Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "bgra8unorm",
      label: "offscreenCanvas",
    });
    this.depthTexture = Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "depth24plus",
      label: "z-buffer Texture",
    });
    this.depthAccumulativeTexture = Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "rgba16float",
      label: "depthAccuTexture",
    });
    this.depthRevealableTexture = Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "r16float",
      label: "depthReveTexture",
    });
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
          { binding: 0, resource: this.universalSampler },
          { binding: 1, resource: this.userTexture.texture.createView() },
        ],
      },
    });
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
  public static get getBuildInCameraBindGroup() {
    assert(
      this.buildInCameraBind !== undefined,
      "trying to get buildIn camera binds but batcher is set to custom camera"
    );
    return this.buildInCameraBind[0];
  }
  public static get getBuildInCameraBindGroupLayout() {
    assert(
      this.buildInCameraBind !== undefined,
      "trying to get buildIn camera binds but batcher is set to custom camera"
    );
    return this.buildInCameraBind[1];
  }
  public static get getUserTextureBindGroup() {
    return this.userTextureBind[0];
  }
  public static get getUserTextureBindGroupLayout() {
    return this.userTextureBind[1];
  }
}
