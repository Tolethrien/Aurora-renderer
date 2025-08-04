import { PipelineBind, RGBA } from "../../aurora";
import Aurora from "../../core";
import { AuroraConfig, ToneMapList } from "../renderer/config";
import Renderer from "../renderer/renderer";
import AuroraDebugInfo from "../debugger/debugInfo";
import colorShader from "../shaders/display/colorCorrection.wgsl?raw";
export interface ColorCorrectionOptions {
  exposure: number;
  saturation: number;
  contrast: number;
  whiteBalance: number;
  hueShift: number;
  brightness: number;
  invert: number;
  tint: RGBA;
}
//TEMPORARY
const options: ColorCorrectionOptions = {
  exposure: 0,
  saturation: 0,
  contrast: 0,
  whiteBalance: 0,
  hueShift: 0,
  brightness: 0,
  invert: 0,
  tint: [0, 0, 0, 0],
};
const ranges = {
  exposure: [-2, 2],
  saturation: [-1, 1],
  contrast: [-1, 1],
  whiteBalance: [-1, 1],
  hueShift: [0, 360], //wheel shift
  brightness: [-1, 1],
  invert: [0, 1],
  tint: [1, 1, 0, 1], //rgb - color, a = nasilenie tintu
};
export enum ScreenSettings {
  exposure,
  saturation,
  contrast,
  whiteBalance,
  hueShift,
  brightness,
  invert,
  padding,
  tint,
}
export default class ColorCorrection {
  private static uniformCorrection: GPUBuffer;
  private static textureBind: PipelineBind;
  private static optionBind: PipelineBind;
  private static pipeline: GPUComputePipeline;
  private static groupSize: AuroraConfig["rendering"]["computeGroupSize"];
  private static options = new Float32Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);

  public static async createPipeline() {
    this.addControl();
    const shader = Aurora.createShader("colorCorrectionShader", colorShader);
    this.uniformCorrection = Aurora.createBuffer({
      bufferType: "uniform",
      dataLength: 13,
      dataType: "Float32Array",
      label: "ColorCorrectionOptions",
    });
    this.textureBind = Aurora.createBindGroup({
      label: "colorCorrectionBind",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("offscreenCanvas"),
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("lightMap"),
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          layout: { texture: { viewDimension: "2d" } },
          resource: Renderer.getTextureView("bloomEffect"),
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          layout: {
            storageTexture: {
              access: "write-only",
              format: "rgba16float",
              viewDimension: "2d",
            },
          },
          resource: Renderer.getTextureView("finalDraw"),
        },
      ],
    });
    this.optionBind = Aurora.createBindGroup({
      label: "colorCorrectionOptionsBind",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          layout: { buffer: { type: "uniform" } },
          resource: { buffer: this.uniformCorrection },
        },
      ],
    });
    const [_, bloomParamsLayout] = Renderer.getBind("bloomParams");

    this.groupSize = Renderer.getConfigGroup("rendering").computeGroupSize;
    const pipelineLayout = Aurora.createPipelineLayout([
      this.textureBind[1],
      this.optionBind[1],
      bloomParamsLayout,
    ]);
    this.pipeline = await Aurora.createComputePipeline({
      shader: shader,
      pipelineName: "colorCorrectionPipeline",
      pipelineLayout: pipelineLayout,
      consts: {
        workgroupSize: this.groupSize,
        toneMapping: ToneMapList[Renderer.getAllConfig.rendering.toneMapping],
      },
    });
  }
  public static usePipeline() {
    const commandEncoder = Renderer.getEncoder;
    const { meta } = Renderer.getTexture("finalDraw");
    const [bloomParams] = Renderer.getBind("bloomParams");
    const size = {
      x: Math.ceil(meta.width / this.groupSize),
      y: Math.ceil(meta.height / this.groupSize),
    };
    Aurora.device.queue.writeBuffer(this.uniformCorrection, 0, this.options, 0);
    const passEncoder = commandEncoder.beginComputePass({
      label: "colorCorrectionRenderPass",
    });
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.textureBind[0]);
    passEncoder.setBindGroup(1, this.optionBind[0]);
    passEncoder.setBindGroup(2, bloomParams);
    passEncoder.dispatchWorkgroups(size.x, size.y);
    passEncoder.end();
    AuroraDebugInfo.accumulate("computeCalls", 1);
    AuroraDebugInfo.accumulate("pipelineInUse", ["ColorCorr"]);
  }
  public static clearPipeline() {}

  public static get getAllScreenSettings() {
    const list: Partial<ColorCorrectionOptions & { padding: number }> = {};
    list["tint"] = [0, 0, 0, 0];
    const tintIndexStart = ScreenSettings["tint"];
    this.options.forEach((value, index) => {
      if (index >= tintIndexStart && index <= tintIndexStart + 4) {
        list["tint"]![index - tintIndexStart] = value;
        return;
      }
      const name = ScreenSettings[index] as keyof typeof ScreenSettings;
      list[name] = value as number & RGBA;
    });
    return list;
  }
  public static getScreenSetting(name: keyof typeof ScreenSettings) {
    return this.options[ScreenSettings[name]];
  }
  public static setScreenSettings(props: Partial<ColorCorrectionOptions>) {
    const tintIndex = ScreenSettings["tint"];
    Object.entries(props).forEach((entry) => {
      const index = ScreenSettings[entry[0] as keyof ColorCorrectionOptions];
      if (index === tintIndex) {
        const tint = entry[1] as RGBA;
        tint.forEach(
          (channel, index) => (this.options[tintIndex + index] = channel)
        );
        return;
      }
      this.options[index] = entry[1] as number;
    });
  }
  //TEMPORARY
  public static addControl() {
    const win = document.createElement("div");

    win.style =
      "display:flex;flex-direction:column;position:absolute;left:0%;top:12%;background-color:rgba(0,0,0,0.5);padding:0.1em";
    win.id = "sdrgr";
    const window = document.getElementsByTagName("body")[0];
    window.appendChild(win);
    Object.keys(options).forEach((option) => {
      const opt = option as keyof typeof options;
      if (Array.isArray(options[opt])) {
        this.tinter();
        return;
      }
      this.controller(ranges[opt][0], ranges[opt][1], options[opt], opt);
    });
  }
  public static controller(
    min: number,
    max: number,
    center: number | number[],
    opt: keyof typeof options
  ) {
    const window = document.getElementById("sdrgr")!;

    const slider = document.createElement("input");
    const name = document.createElement("p");
    name.innerText = `${opt}`;
    slider.setAttribute("type", "range");
    slider.setAttribute("min", String(min));
    slider.setAttribute("max", String(max));
    slider.setAttribute("value", String(center));
    slider.step = String(0.01);
    slider.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      this.options[ScreenSettings[opt]] = Number(target.value);
    });
    window.appendChild(name);
    window.appendChild(slider);
  }
  public static tinter() {
    const indexStart = ScreenSettings["tint"];
    Array(4)
      .fill(0)
      .forEach((_, index) => {
        const color = ["TintRed", "TintGreen", "TintBlue", "TintBlend"];
        const window = document.getElementById("sdrgr")!;

        const slider = document.createElement("input");
        const name = document.createElement("p");
        name.innerText = `${color[index]}`;
        slider.setAttribute("type", "range");
        slider.setAttribute("min", String(0));
        slider.setAttribute("max", String(1));
        slider.setAttribute("value", String(0));
        slider.step = String(0.01);
        slider.addEventListener("input", (event) => {
          const target = event.target as HTMLInputElement;

          this.options[indexStart + index] = Number(target.value);
        });
        window.appendChild(name);
        window.appendChild(slider);
      });
  }
}
