import { assert } from "../../utils/utils";
import Aurora from "../core";
import AuroraCamera from "./camera";
import ShapePipe from "./pipelines/shapePipe";
import SpritePipe from "./pipelines/spritePipe";
import dummyTexture from "./assets/dummy.png";
import { GPUAuroraTexture } from "../aurora";
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
const INIT_OPTIONS: BatcherOptions = {
  customCamera: false,
  zBuffer: "y",
  textures: [],
};
const PIPELINES = {
  shape: ShapePipe,
  // text: TextPipe,
  sprite: SpritePipe,
};
type PipelineBind = [GPUBindGroup, GPUBindGroupLayout] | undefined;
export default class Batcher {
  private static batcherOptions: BatcherOptions = structuredClone(INIT_OPTIONS);
  private static indexBuffer: GPUBuffer;
  private static buildInCameraBind: PipelineBind;
  private static userTextureBind: PipelineBind;
  private static buildInCameraBuffer: GPUBuffer;
  private static buildInCameraBoundBuffer: GPUBuffer;
  public static pipelinesUsedInFrame: Set<keyof typeof PIPELINES> = new Set();
  public static depthTexture: GPUAuroraTexture;
  private static userTexture: GPUAuroraTexture;
  private static userTextureIndexes: Map<string, number> = new Map();
  private static universalSampler: GPUSampler;
  private static cameraBounds = new Float32Array([0, 0]);

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

    Object.values(PIPELINES).forEach((pipeline) => pipeline.createPipeline());
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
    this.pipelinesUsedInFrame.forEach((name) => PIPELINES[name].usePipeline());
  }
  public static updateCameraBound(value: number) {
    this.cameraBounds[0] = Math.min(this.cameraBounds[0], value);
    this.cameraBounds[1] = Math.max(this.cameraBounds[1], value);
  }
  private static clearTextures() {
    const textureView = Aurora.context.getCurrentTexture().createView();
    const commandEncoder = Aurora.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.2, b: 0.6, a: 1.0 },
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
      name: "cameraBind",
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
    this.depthTexture = Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "depth24plus",
      label: "z-buffer Texture",
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
      name: "userTextureBind",
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
        `WARNIRNG: No texture with name ${name} present in Batcher! fallback to color`
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
    return this.userTextureBind![0];
  }
  public static get getUserTextureBindGroupLayout() {
    return this.userTextureBind![1];
  }
}
