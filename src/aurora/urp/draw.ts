import { RGBA, Position2D, Size2D, RGB } from "../aurora";
import FontGen, { MsdfChar } from "./renderer/fontGen";
import AuroraCamera from "./camera";
import LightsPipe from "./pipelines/lights";
import Renderer from "./renderer/renderer";

interface BaseDraw {
  position: Position2D;
  size: Size2D;
  tint?: RGBA;
}
interface DrawRect extends BaseDraw {
  emissive?: number;
}
interface DrawCircle extends BaseDraw {
  emissive?: number;
}
interface DrawSprite extends BaseDraw {
  crop: Position2D & Size2D;
  textureToUse: string;
  emissive?: number;
}
interface DrawText {
  position: Position2D;
  text: string;
  font: string;
  fontSize: number;
  fontColor?: RGBA;
  emissive?: number;
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
  public static rect({ position, size, tint, emissive = 1 }: DrawRect) {
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

    batch.counter++;
  }

  public static circle({ position, size, tint, emissive = 1 }: DrawCircle) {
    const Pipeline = Renderer.getDrawPipeline();
    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batchType = color[3] === 255 ? "circle" : "circleTransparent";
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

    batch.counter++;
  }
  public static sprite({
    position,
    size,
    tint,
    crop,
    textureToUse,
    emissive = 1,
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

      batch.counter++;

      xCursor += charData.xadvance * scale;
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
}
