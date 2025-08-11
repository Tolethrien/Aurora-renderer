import { RGBA, Position2D, Size2D, RGB } from "../aurora";
import FontGen, { MsdfChar } from "./renderer/fontGen";
import AuroraCamera from "./camera";
import LightsPipe from "./pipelines/lights";
import Renderer from "./renderer/renderer";
import GuiPipeline from "./pipelines/gui";
import Aurora from "../core";

type UiDrawMode = "pixel" | "percent";
type UIPosition2D = Position2D & { mode: UiDrawMode };
type UISize2D = Size2D & { mode: UiDrawMode };
interface BaseDraw {
  position: Position2D;
  size: Size2D;
  tint?: RGBA;
}

interface BaseUiDraw {
  position: UIPosition2D;
  size: UISize2D;
  tint?: RGBA;
  rounded?: number;
  layer: number;
}
interface DrawUiNodeWithBackground extends BaseUiDraw {
  background: string;
  crop: Position2D & Size2D;
}

interface DrawUiNodeWithoutBackground extends BaseUiDraw {
  background?: undefined;
  crop?: never;
}

type DrawUiNode = DrawUiNodeWithBackground | DrawUiNodeWithoutBackground;

interface DrawRect extends BaseDraw {
  emissive?: number;
  rounded?: number;
}
interface DrawCircle extends BaseDraw {
  emissive?: number;
}
interface DrawSprite extends BaseDraw {
  crop: Position2D & Size2D;
  textureToUse: string;
  emissive?: number;
  rounded?: number;
}

interface DrawText {
  position: Position2D;
  text: string;
  font: string;
  fontSize: number;
  fontColor?: RGBA;
  emissive?: number;
}
interface DrawGuiText {
  position: UIPosition2D;
  text: string;
  font: string;
  fontSize: number;
  fontColor?: RGBA;
  layer: number;
}
interface DrawPointLight extends Omit<BaseDraw, "tint"> {
  intensity: number;
  tint?: RGB;
}
export type BatchType = "text" | "shape";
export interface GetBatch {
  type: BatchType;
  alpha?: number;
}
export interface BatchAccumulator {
  verticesData: number[];
  vertices: number[];
  count: number;
  type: GetBatch["type"];
}
export default class Draw {
  public static rect({
    position,
    size,
    tint,
    emissive = 1,
    rounded = 0,
  }: DrawRect) {
    const Pipeline = Renderer.getDrawPipeline();
    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batchType = color[3] === 255 ? "quad" : "quadTransparent";
    const batch = Pipeline.getBatch(batchType);
    const vertexStride = Pipeline.getStride;
    AuroraCamera.setCameraBounds(position.y, size.height);
    batch.vertices[batch.counter * vertexStride] = position.x;
    batch.vertices[batch.counter * vertexStride + 1] = position.y;
    batch.vertices[batch.counter * vertexStride + 2] = size.width;
    batch.vertices[batch.counter * vertexStride + 3] = size.height;
    batch.vertices[batch.counter * vertexStride + 4] = 0;
    batch.vertices[batch.counter * vertexStride + 5] = 0;
    batch.vertices[batch.counter * vertexStride + 6] = 1;
    batch.vertices[batch.counter * vertexStride + 7] = 1;
    batch.vertices[batch.counter * vertexStride + 8] = 0;
    batch.vertices[batch.counter * vertexStride + 9] = color[0];
    batch.vertices[batch.counter * vertexStride + 10] = color[1];
    batch.vertices[batch.counter * vertexStride + 11] = color[2];
    batch.vertices[batch.counter * vertexStride + 12] = color[3];
    batch.vertices[batch.counter * vertexStride + 13] = emissive;
    batch.vertices[batch.counter * vertexStride + 14] = rounded;
    batch.counter++;
  }

  public static circle({ position, size, tint, emissive = 1 }: DrawCircle) {
    //it uses full rounded quad to draw circle
    const Pipeline = Renderer.getDrawPipeline();
    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batchType = color[3] === 255 ? "quad" : "quadTransparent";

    const batch = Pipeline.getBatch(batchType);
    const vertexStride = Pipeline.getStride;
    AuroraCamera.setCameraBounds(position.y, size.height);
    batch.vertices[batch.counter * vertexStride] = position.x;
    batch.vertices[batch.counter * vertexStride + 1] = position.y;
    batch.vertices[batch.counter * vertexStride + 2] = size.width;
    batch.vertices[batch.counter * vertexStride + 3] = size.height;
    batch.vertices[batch.counter * vertexStride + 4] = 0;
    batch.vertices[batch.counter * vertexStride + 5] = 0;
    batch.vertices[batch.counter * vertexStride + 6] = 1;
    batch.vertices[batch.counter * vertexStride + 7] = 1;
    batch.vertices[batch.counter * vertexStride + 8] = 0;
    batch.vertices[batch.counter * vertexStride + 9] = color[0];
    batch.vertices[batch.counter * vertexStride + 10] = color[1];
    batch.vertices[batch.counter * vertexStride + 11] = color[2];
    batch.vertices[batch.counter * vertexStride + 12] = color[3];
    batch.vertices[batch.counter * vertexStride + 13] = emissive;
    batch.vertices[batch.counter * vertexStride + 14] = 1;

    batch.counter++;
  }
  public static sprite({
    position,
    size,
    tint,
    crop,
    textureToUse,
    emissive = 1,
    rounded = 0,
  }: DrawSprite) {
    const Pipeline = Renderer.getDrawPipeline();

    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batchType = color[3] === 255 ? "quad" : "quadTransparent";
    const batch = Pipeline.getBatch(batchType);
    const vertexStride = Pipeline.getStride;
    AuroraCamera.setCameraBounds(position.y, size.height);
    const textureIndex = Renderer.getTextureIndex(textureToUse);
    batch.vertices[batch.counter * vertexStride] = position.x;
    batch.vertices[batch.counter * vertexStride + 1] = position.y;
    batch.vertices[batch.counter * vertexStride + 2] = size.width;
    batch.vertices[batch.counter * vertexStride + 3] = size.height;
    batch.vertices[batch.counter * vertexStride + 4] = crop.x;
    batch.vertices[batch.counter * vertexStride + 5] = crop.y;
    batch.vertices[batch.counter * vertexStride + 6] = crop.width;
    batch.vertices[batch.counter * vertexStride + 7] = crop.height;
    batch.vertices[batch.counter * vertexStride + 8] = textureIndex;
    batch.vertices[batch.counter * vertexStride + 9] = color[0];
    batch.vertices[batch.counter * vertexStride + 10] = color[1];
    batch.vertices[batch.counter * vertexStride + 11] = color[2];
    batch.vertices[batch.counter * vertexStride + 12] = color[3];
    batch.vertices[batch.counter * vertexStride + 13] = emissive;
    batch.vertices[batch.counter * vertexStride + 14] = rounded;

    batch.counter++;
  }
  public static guiRect({
    position,
    size,
    tint,
    rounded = 0,
    background,
    crop = { x: 0, y: 0, width: 1, height: 1 },
    layer,
  }: DrawUiNode) {
    const Pipeline = GuiPipeline;

    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batchType = color[3] === 255 ? "quad" : "quadTransparent";
    const batch = Pipeline.getBatch(batchType);
    const vertexStride = Pipeline.getStride;
    const convertedPos = this.convertPosition(position);
    const convertedSize = this.convertSize(size);
    let textureIndex = 0;
    if (background) textureIndex = Renderer.getTextureIndex(background);
    batch.vertices[batch.counter * vertexStride] = convertedPos.x;
    batch.vertices[batch.counter * vertexStride + 1] = convertedPos.y;
    batch.vertices[batch.counter * vertexStride + 2] = convertedSize.width;
    batch.vertices[batch.counter * vertexStride + 3] = convertedSize.height;
    batch.vertices[batch.counter * vertexStride + 4] = crop.x;
    batch.vertices[batch.counter * vertexStride + 5] = crop.y;
    batch.vertices[batch.counter * vertexStride + 6] = crop.width;
    batch.vertices[batch.counter * vertexStride + 7] = crop.height;
    batch.vertices[batch.counter * vertexStride + 8] = textureIndex;
    batch.vertices[batch.counter * vertexStride + 9] = layer / 100;
    batch.vertices[batch.counter * vertexStride + 10] = rounded;
    batch.vertices[batch.counter * vertexStride + 11] = color[0];
    batch.vertices[batch.counter * vertexStride + 12] = color[1];
    batch.vertices[batch.counter * vertexStride + 13] = color[2];
    batch.vertices[batch.counter * vertexStride + 14] = color[3];

    batch.counter++;
  }

  public static text({
    position,
    font,
    fontColor,
    fontSize,
    text,
    emissive = 1,
  }: DrawText) {
    const Pipeline = Renderer.getDrawPipeline();
    const stride = Pipeline.getStride;

    const fontData = Renderer.getUserFontData(font).getMeta;
    const fontIndex = Renderer.getUserFontData(font).getIndex;
    const { chars, kernings, lineHeight } = fontData;
    const scale = fontSize / lineHeight;
    const color: RGBA = fontColor ? fontColor : [255, 255, 255, 255];

    AuroraCamera.setCameraBounds(position.y, fontSize * (lineHeight * 2));

    const textMeasure = FontGen.measureText({ fontName: font, fontSize, text });
    const drawOrigin = Renderer.getConfigGroup("rendering").drawOrigin;
    const originX = drawOrigin === "center" ? textMeasure.width / 2 : 0;
    const originY = drawOrigin === "center" ? textMeasure.height / 2 : 0;
    let xCursor = position.x - originX;
    let yCursor = position.y - originY;

    let prevCharCode: number | null = null;

    for (const char of text) {
      const batch = Pipeline.getBatch("text");
      const code = char.charCodeAt(0);
      const charData: MsdfChar = chars[code] ?? fontData.defaultChar;
      if (prevCharCode !== null && kernings) {
        const kernRow = kernings.get(prevCharCode);
        if (kernRow) {
          const kernAmount = kernRow.get(code) || 0;
          xCursor += kernAmount * scale;
        }
      }

      const w = charData.width * scale;
      const h = charData.height * scale;

      const x0 = xCursor + charData.xoffset * scale;
      const y0 = yCursor + charData.yoffset * scale;

      const centerX = x0 + w * 0.5;
      const centerY = y0 + h * 0.5;
      const u = charData.x / fontData.scale.w;
      const v = charData.y / fontData.scale.h;
      const uWidth = charData.width / fontData.scale.w;
      const vHeight = charData.height / fontData.scale.h;

      batch.vertices[batch.counter * stride] = centerX;
      batch.vertices[batch.counter * stride + 1] = centerY;
      batch.vertices[batch.counter * stride + 2] = w;
      batch.vertices[batch.counter * stride + 3] = h;
      batch.vertices[batch.counter * stride + 4] = u;
      batch.vertices[batch.counter * stride + 5] = v;
      batch.vertices[batch.counter * stride + 6] = uWidth;
      batch.vertices[batch.counter * stride + 7] = vHeight;
      batch.vertices[batch.counter * stride + 8] = fontIndex;
      batch.vertices[batch.counter * stride + 9] = color[0];
      batch.vertices[batch.counter * stride + 10] = color[1];
      batch.vertices[batch.counter * stride + 11] = color[2];
      batch.vertices[batch.counter * stride + 12] = color[3];
      batch.vertices[batch.counter * stride + 13] = emissive;
      batch.vertices[batch.counter * stride + 14] = 0;

      batch.counter++;

      xCursor += charData.xadvance * scale;
      prevCharCode = code;
    }
  }
  public static guiText({
    position,
    font,
    fontColor,
    fontSize,
    text,
    layer,
  }: DrawGuiText) {
    const Pipeline = GuiPipeline;
    const stride = Pipeline.getStride;
    const screenWidth = Aurora.canvas.width;
    const screenHeight = Aurora.canvas.height;
    fontSize += 8;
    let posPx = { x: position.x, y: position.y };
    if (position.mode === "percent") {
      posPx.x = (position.x / 100) * screenWidth;
      posPx.y = (position.y / 100) * screenHeight;
    }

    const fontData = Renderer.getUserFontData(font).getMeta;
    const fontIndex = Renderer.getUserFontData(font).getIndex;
    const { chars, kernings, lineHeight } = fontData;

    const scale = fontSize / lineHeight;
    const color: RGBA = fontColor ? fontColor : [255, 255, 255, 255];

    let xCursorPixel = posPx.x;
    let yCursorPixel = posPx.y;

    let prevCharCode: number | null = null;

    for (const char of text) {
      const batch = Pipeline.getBatch("text");
      const code = char.charCodeAt(0);
      const charData: MsdfChar = chars[code] ?? fontData.defaultChar;

      if (prevCharCode !== null && kernings) {
        const kernRow = kernings.get(prevCharCode);
        if (kernRow) {
          const kernAmount = kernRow.get(code) || 0;
          xCursorPixel += kernAmount * scale;
        }
      }

      const x0Pixel = xCursorPixel + charData.xoffset * scale;
      const y0Pixel = yCursorPixel + charData.yoffset * scale;
      const wNdc = (charData.width * scale) / (screenWidth / 2);
      const hNdc = (charData.height * scale) / (screenHeight / 2);
      const xNdcLeft = (x0Pixel / screenWidth) * 2 - 1;
      const yNdcTop = 1 - (y0Pixel / screenHeight) * 2;

      const u = charData.x / fontData.scale.w;
      const v = charData.y / fontData.scale.h;
      const uWidth = charData.width / fontData.scale.w;
      const vHeight = charData.height / fontData.scale.h;

      batch.vertices[batch.counter * stride] = xNdcLeft + wNdc * 0.5;
      batch.vertices[batch.counter * stride + 1] = yNdcTop - hNdc * 0.5;
      batch.vertices[batch.counter * stride + 2] = wNdc;
      batch.vertices[batch.counter * stride + 3] = hNdc;
      batch.vertices[batch.counter * stride + 4] = u;
      batch.vertices[batch.counter * stride + 5] = v;
      batch.vertices[batch.counter * stride + 6] = uWidth;
      batch.vertices[batch.counter * stride + 7] = vHeight;
      batch.vertices[batch.counter * stride + 8] = fontIndex;
      batch.vertices[batch.counter * stride + 9] = layer / 100;
      batch.vertices[batch.counter * stride + 10] = 0;
      batch.vertices[batch.counter * stride + 11] = color[0];
      batch.vertices[batch.counter * stride + 12] = color[1];
      batch.vertices[batch.counter * stride + 13] = color[2];
      batch.vertices[batch.counter * stride + 14] = color[3];

      batch.counter++;
      xCursorPixel += charData.xadvance * scale;
      prevCharCode = code;
    }
  }
  public static pointLight({
    intensity,
    position,
    size,
    tint,
  }: DrawPointLight) {
    const color: RGB = tint ? tint : [255, 255, 255];
    const stride = LightsPipe.getStride;
    const batch = LightsPipe.getBatch();
    batch.vertices[batch.counter * stride] = position.x;
    batch.vertices[batch.counter * stride + 1] = position.y;
    batch.vertices[batch.counter * stride + 2] = size.width;
    batch.vertices[batch.counter * stride + 3] = size.height;
    batch.vertices[batch.counter * stride + 4] = color[0];
    batch.vertices[batch.counter * stride + 5] = color[1];
    batch.vertices[batch.counter * stride + 6] = color[2];
    batch.vertices[batch.counter * stride + 7] = intensity;
    batch.counter++;
  }
  private static convertPosition(position: DrawUiNode["position"]) {
    const canvasSize = { w: Aurora.canvas.width, h: Aurora.canvas.height };
    let newPos = { x: position.x, y: position.y };
    if (position.mode === "percent") {
      newPos.x = (newPos.x / 100) * canvasSize.w;
      newPos.y = (newPos.y / 100) * canvasSize.h;
    }
    return {
      x: (newPos.x / canvasSize.w) * 2 - 1,
      y: 1 - (newPos.y / canvasSize.h) * 2,
    };
  }
  private static convertSize(size: DrawUiNode["size"]) {
    const canvasSize = { w: Aurora.canvas.width, h: Aurora.canvas.height };
    let newSize = { width: size.width, height: size.height };
    if (size.mode === "percent") {
      newSize.width = (newSize.width / 100) * canvasSize.w;
      newSize.height = (newSize.height / 100) * canvasSize.h;
    }
    return {
      width: (newSize.width / canvasSize.w) * 2,
      height: (newSize.height / canvasSize.h) * 2,
    };
  }
}
