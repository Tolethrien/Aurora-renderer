import { DeepPartial, RGB, RGBA } from "../../aurora";
import { FontGenProps } from "./fontGen";
import dummyTexture from "../assets/dummy.png";
import jerseyImg from "../assets/Jersey25-Regular.png";
import jerseyJson from "../assets/Jersey25-Regular-msdf.json";
import latoImg from "../assets/Lato-Regular.png";
import latoJson from "../assets/Lato-Regular-msdf.json";
type RenderRes = "1900x1080" | "1600x900" | "800x600";
type SortOrder = "none" | "y" | "y+x";
type Profiler = "none" | "minimal" | "normal" | "extended";
type UserTexture = { name: string; url: string };
// type CameraProjection = "ortho" | "perspective" | "isometric";
type ToneMaps = "rainhard" | "aces" | "filmic" | "none";
export enum ToneMapList {
  none,
  rainhard,
  aces,
  filmic,
}
export interface AuroraConfig {
  HDR: {
    toneMapping: ToneMaps;
  };
  feature: {
    bloom: boolean;
    lighting: boolean;
  };
  bloom: {
    numberOfPasses: number;
    threshold: number;
    knee: number;
    intense: number;
  };
  rendering: {
    renderRes: RenderRes;
    drawOrigin: "center" | "topLeft";
    sortOrder: SortOrder;
    transparentCanvas: boolean;
    canvasColor: RGBA;
  };
  camera: {
    builtInCameraInputs: boolean;
    zoom: { min: number; max: number };
    speed: number;
  };
  screen: {
    colorCorrection: RGB;
    saturation: number;
    exposure: number;
  };
  debugger: Profiler;
  userTextures: UserTexture[];
  userFonts: FontGenProps[];
}
const INIT_OPTIONS: AuroraConfig = {
  feature: {
    bloom: true,
    lighting: true,
  },
  bloom: { intense: 0.7, knee: 0.2, threshold: 1, numberOfPasses: 3 },
  HDR: { toneMapping: "aces" },
  rendering: {
    drawOrigin: "center",
    renderRes: "800x600",
    sortOrder: "y",
    transparentCanvas: false,
    canvasColor: [255, 255, 255, 255],
  },
  screen: {
    colorCorrection: [255, 255, 255],
    exposure: 1,
    saturation: 1,
  },
  camera: {
    builtInCameraInputs: true,
    speed: 15,
    zoom: { min: 0.1, max: 10 },
  },
  debugger: "normal",
  userTextures: [],
  userFonts: [],
};
export default function auroraConfig(props: DeepPartial<AuroraConfig>) {
  const config = deepMerge(structuredClone(INIT_OPTIONS), props);
  config.userTextures.unshift({ name: "colorRect", url: dummyTexture });
  config.userFonts.push({
    fontName: "lato",
    img: latoImg,
    json: latoJson,
  });
  config.userFonts.push({
    fontName: "jersey",
    img: jerseyImg,
    json: jerseyJson,
  });
  return config;
}

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const output = { ...target } as T;

  if (
    target &&
    typeof target === "object" &&
    source &&
    typeof source === "object"
  ) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key as keyof DeepPartial<T>];
        const targetValue = target[key as keyof T];

        if (
          sourceValue &&
          typeof sourceValue === "object" &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === "object" &&
          !Array.isArray(targetValue)
        ) {
          (output as any)[key] = deepMerge(
            targetValue as object,
            sourceValue as object
          );
        } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          (output as any)[key] = sourceValue;
        } else {
          (output as any)[key] = sourceValue;
        }
      }
    }
  }
  return output;
}
