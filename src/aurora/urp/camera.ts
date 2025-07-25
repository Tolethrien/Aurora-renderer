import Mat4 from "../../utils/mat4";
import { assert } from "../../utils/utils";
import { PipelineBind } from "../aurora";
import Aurora from "../core";
type CameraZoom = { current: number; max: number; min: number };
type CameraPosition = { x: number; y: number };
const cameraData = {
  keyPressed: new Set(),
};

export default class AuroraCamera {
  private static view: Mat4;
  private static projectionViewMatrix: Mat4;
  private static position: CameraPosition = { x: 0, y: 0 };
  private static speed: number;
  private static zoom: CameraZoom = {
    current: 0,
    max: 0,
    min: 0,
  };
  private static buildInCameraBind: PipelineBind | undefined;
  private static cameraBounds = new Float32Array([Infinity, -Infinity]);
  private static buildInCameraBuffer: GPUBuffer;
  private static buildInCameraBoundBuffer: GPUBuffer;

  public static initialize() {
    this.projectionViewMatrix = Mat4.create();
    this.view = Mat4.create().lookAt([0, 0, 0], [0, 0, 0], [0, 1, 0]);
    this.position.x = Aurora.canvas.width / 2;
    this.position.y = Aurora.canvas.height / 2;
    this.speed = 15;
    this.zoom = { current: 1, max: 10, min: 0.1 };
    window.onkeydown = (event: KeyboardEvent) => {
      const pressedKey = event.key === " " ? "space" : event.key;
      !event.repeat && cameraData.keyPressed.add(pressedKey);
    };
    window.onkeyup = (event: KeyboardEvent) => {
      const pressedKey = event.key === " " ? "space" : event.key;
      cameraData.keyPressed.has(pressedKey) &&
        cameraData.keyPressed.delete(pressedKey);
    };

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
    this.update();
    //===========================================
  }
  public static update() {
    if (cameraData.keyPressed.has("d")) this.position.x += this.speed;
    else if (cameraData.keyPressed.has("a")) this.position.x -= this.speed;
    if (cameraData.keyPressed.has("w")) this.position.y -= this.speed;
    else if (cameraData.keyPressed.has("s")) this.position.y += this.speed;
    if (cameraData.keyPressed.has("ArrowUp"))
      this.zoom.current > this.zoom.min &&
        (this.zoom.current -= 0.01 * Math.log(this.zoom.current + 1));
    else if (cameraData.keyPressed.has("ArrowDown"))
      this.zoom.current < this.zoom.max &&
        (this.zoom.current += 0.01 * Math.log(this.zoom.current + 1));

    this.projectionViewMatrix = Mat4.create()
      .ortho(
        this.position.x - (Aurora.canvas.width / 2) * this.zoom.current,
        this.position.x + (Aurora.canvas.width / 2) * this.zoom.current,
        this.position.y + (Aurora.canvas.height / 2) * this.zoom.current,
        this.position.y - (Aurora.canvas.height / 2) * this.zoom.current,
        -1,
        1
      )
      .multiply(this.view);
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBuffer,
      0,
      AuroraCamera.getProjectionViewMatrix.getMatrix
    );
  }

  public static updateCameraBound() {
    Aurora.device.queue.writeBuffer(
      this.buildInCameraBoundBuffer,
      0,
      this.cameraBounds
    );
  }
  public static setCameraBounds(y: number, h: number) {
    const top = y;
    const bottom = y + h;
    this.cameraBounds[0] = Math.min(this.cameraBounds[0], top);
    this.cameraBounds[1] = Math.max(this.cameraBounds[1], bottom);
  }

  public static get getProjectionViewMatrix() {
    return this.projectionViewMatrix;
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
