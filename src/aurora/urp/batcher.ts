import { assert } from "../../utils/utils";
import Aurora from "../core";
import AuroraCamera from "./camera";
import ShapePipe from "./pipelines/shapePipe";
import TextPipe from "./pipelines/textPipe";

export interface Pipeline {
  usePipeline: () => void;
  createPipeline: () => void;
  clearBatch: () => void;
}
const INIT_OPTIONS = {
  customCamera: false,
};
const PIPELINES = {
  shape: ShapePipe,
  // text: TextPipe,
};
export type BatcherOptions = typeof INIT_OPTIONS;
type BuildInCameraBinds = [GPUBindGroup, GPUBindGroupLayout] | undefined;
export default class Batcher {
  private static batcherOptions: BatcherOptions = structuredClone(INIT_OPTIONS);
  public static indexBuffer: GPUBuffer;
  private static buildInCameraBind: BuildInCameraBinds;
  private static buildInCameraBuffer: GPUBuffer;
  public static pipelinesUsedInFrame: Set<keyof typeof PIPELINES> = new Set();

  public static Initialize() {
    this.indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });
    if (!this.batcherOptions.customCamera) this.createBuildInCamera();

    ShapePipe.createPipeline();
  }
  public static beginBatch() {
    this.clearTextures();
    this.pipelinesUsedInFrame.forEach((name) => PIPELINES[name].clearBatch());
    this.pipelinesUsedInFrame.clear();
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBuffer,
      0,
      AuroraCamera.getProjectionViewMatrix.getMatrix
    );
  }
  public static endBatch() {
    this.pipelinesUsedInFrame.forEach((name) => PIPELINES[name].usePipeline());
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
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBuffer,
      0,
      AuroraCamera.getProjectionViewMatrix.getMatrix
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
        ],
        label: "cameraBindLayout",
      },
      data: {
        label: "cameraBindData",
        entries: [
          { binding: 0, resource: { buffer: this.buildInCameraBuffer } },
        ],
      },
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
