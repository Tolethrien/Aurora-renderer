import { assert } from "../../utils/utils";
import Aurora from "../core";
import AuroraCamera from "./camera";
import ShapePipe from "./pipelines/shapePipe";

export interface Pipeline {
  usePipeline: () => void;
  createPipeline: () => void;
  clearBatch: () => void;
}
export type BatcherOptions = {
  customCamera: boolean;
  zBuffer: "none" | "y" | "y-x";
};
const INIT_OPTIONS: BatcherOptions = {
  customCamera: false,
  zBuffer: "y",
};
const PIPELINES = {
  shape: ShapePipe,
  // text: TextPipe,
};
type BuildInCameraBinds = [GPUBindGroup, GPUBindGroupLayout] | undefined;
export default class Batcher {
  private static batcherOptions: BatcherOptions = structuredClone(INIT_OPTIONS);
  private static indexBuffer: GPUBuffer;
  private static buildInCameraBind: BuildInCameraBinds;
  private static buildInCameraBuffer: GPUBuffer;
  private static buildInCameraBoundBuffer: GPUBuffer;
  public static pipelinesUsedInFrame: Set<keyof typeof PIPELINES> = new Set();
  public static depthTexture: GPUTexture;
  public static cameraBounds = new Float32Array([0, 0]);

  public static Initialize() {
    this.indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });

    if (this.batcherOptions.zBuffer !== "none") this.createDepthTexture();

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
  public static updateCameraBound(y: number) {
    this.cameraBounds[0] = Math.min(this.cameraBounds[0], y);
    this.cameraBounds[1] = Math.max(this.cameraBounds[1], y);
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
        view: this.depthTexture.createView(),
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
    this.depthTexture = Aurora.device.createTexture({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
        depthOrArrayLayers: 1,
      },
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
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
}
