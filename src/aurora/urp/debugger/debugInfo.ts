import { RGB } from "../../aurora";
import Aurora from "../../core";
import Batcher, { BatcherOptions } from "../batcher/batcher";
const TEXTURES_TO_SHOW = [
  "canvas",
  "offscreenCanvas",
  "lightMap",
  "zBufferDump",
  "HDR",
] as const;
type textures = (typeof TEXTURES_TO_SHOW)[number];
interface DebugData {
  fps: number;
  GPUTime: number;
  CPUTime: number;
  pipelineInUse: string[];
  //   pipelineTimes: { name: string; time: number }[];
  displayedTexture: textures | (string & {});
  drawCalls: number;
  computeCalls: number;
  totalCalls: number;
  drawnQuads: number;
  drawnLights: number;
  drawnTriangles: number;
  drawnVertices: number;
  colorCorrection: RGB;
  usedPostProcessing: string[];
  sortOrder: BatcherOptions["sortOrder"];
  drawOrigin: BatcherOptions["drawOrigin"];
}
const DATA_INIT: DebugData = {
  fps: 0,
  GPUTime: 0,
  CPUTime: 0,
  pipelineInUse: [],
  //   pipelineTimes: [],
  displayedTexture: "canvas",
  drawCalls: 0,
  computeCalls: 0,
  totalCalls: 0,
  drawnQuads: 0,
  drawnLights: 0,
  drawnTriangles: 0,
  drawnVertices: 0,
  colorCorrection: [0, 0, 0],
  usedPostProcessing: [],
  sortOrder: "none",
  drawOrigin: "center",
};
export default class AuroraDebugInfo {
  private static isGathering = false;
  private static tick = 0;
  private static data: DebugData = structuredClone(DATA_INIT);
  private static query: GPUQuerySet;
  private static writeBuffer: GPUBuffer;
  private static readBuffer: GPUBuffer;
  private static lastFrameTime = 0;
  private static frameTimeStart = 0;
  public static debugVisibleTextureIndex = new Uint32Array([0]);
  //0 offscreen/1 depth

  public static get isWorking() {
    return this.isGathering;
  }
  public static setWorking(val: boolean) {
    this.isGathering = val;

    this.query = Aurora.device.createQuerySet({
      type: "timestamp",
      count: 2,
    });
    this.writeBuffer = Aurora.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
    });
    this.readBuffer = Aurora.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    //@ts-ignore
    window.debugTextureNext = () => this.nextTexture();
  }

  public static update<T extends keyof DebugData>(
    data: T,
    value: DebugData[T]
  ) {
    if (!this.isGathering) return;
    this.data[data] = value;
  }
  public static accumulate<T extends keyof DebugData>(
    data: T,
    value: DebugData[T]
  ) {
    if (!this.isGathering) return;

    const last = this.data[data];

    if (typeof last === "string")
      console.warn(`you cannot accumulate string value for ${data}`);
    else if (typeof last === "number" && typeof value === "number")
      this.data[data] = (last + value) as DebugData[T];
    else if (typeof last === "object" && typeof value === "object")
      this.data[data] = [...last, ...value] as DebugData[T];
  }
  public static get getAllData() {
    return this.data;
  }
  public static nextTexture() {
    this.debugVisibleTextureIndex[0] =
      (this.debugVisibleTextureIndex[0] + 1) % TEXTURES_TO_SHOW.length;
    this.update(
      "displayedTexture",
      TEXTURES_TO_SHOW[this.debugVisibleTextureIndex[0]]
    );
  }

  public static get getVisibleTexture() {
    return this.debugVisibleTextureIndex;
  }
  public static getSpecific<T extends keyof DebugData>(data: T) {
    return this.data[data];
  }
  public static clearData() {
    const gpuTime = this.data["GPUTime"];
    const texture = this.data["displayedTexture"];
    this.data = structuredClone(DATA_INIT);
    this.data.GPUTime = gpuTime;
    this.data.displayedTexture = texture;
    this.data.sortOrder = Batcher.getBatcherOptions.sortOrder;
    this.data.drawOrigin = Batcher.getBatcherOptions.drawOrigin;
    this.data.colorCorrection = Batcher.getBatcherOptions.colorCorrection;
  }
  public static displayEveryFrame(frame: number, clear: boolean = false) {
    this.tick++;
    if (this.tick % frame !== 0) return;
    if (clear) console.clear();
    console.group("Debug Data");
    console.log("FPS:", this.data.fps);
    if (this.isGathering) {
      console.log("CPU Time:", `${this.data.CPUTime} ms`);
      console.log("GPU Time:", `${this.data.GPUTime} ms`);
      for (const [name, val] of Object.entries(this.data)) {
        if (name === "fps" || name === "GPUTime" || name === "CPUTime")
          continue;
        console.log(`${name}:`, val);
      }
    }
    console.groupEnd();
    this.tick = 0;
  }

  public static getQuery() {
    return {
      qSet: this.query,
      qWrite: this.writeBuffer,
      qRead: this.readBuffer,
    };
  }
  public static startCount(timestamp: number) {
    if (this.isGathering) this.clearData();
    timestamp *= 0.001;
    const deltaTime = timestamp - this.lastFrameTime;
    this.data["fps"] = Number((1 / deltaTime).toFixed(1));
    this.lastFrameTime = timestamp;
    this.frameTimeStart = performance.now();
  }
  public static endCount() {
    if (!this.isGathering) return;
    const time = performance.now() - this.frameTimeStart;
    this.data["CPUTime"] = Number(time.toFixed(1));
  }
}
