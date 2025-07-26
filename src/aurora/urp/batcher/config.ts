import { DeepPartial, RGB } from "../../aurora";
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
type CameraProjection = "ortho" | "perspective" | "isometric";
type ToneMaps = "rainhard" | "aces" | "filmic" | "none";
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
  };
  camera: {
    customCamera: boolean;
    builtInCameraProjection: CameraProjection;
    builtInCameraInputs: boolean;
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
  },
  screen: {
    colorCorrection: [255, 255, 255],
    exposure: 1,
    saturation: 1,
  },
  camera: {
    customCamera: false,
    builtInCameraProjection: "ortho",
    builtInCameraInputs: false,
  },
  debugger: "normal",
  userTextures: [],
  userFonts: [],
};
export default function auroraConfig(props: DeepPartial<AuroraConfig>) {
  const config = structuredClone({ ...INIT_OPTIONS, ...props }) as AuroraConfig;
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
