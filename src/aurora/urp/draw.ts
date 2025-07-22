import { RGBA, Position2D, Size2D } from "../aurora";
import Batcher from "./batcher/batcher";
import FontGen, { MsdfChar } from "./batcher/fontGen";
import AuroraCamera from "./camera";
import { getDrawPipeline } from "./batcher/pipes";
import AuroraDebugInfo from "./debugger/debugInfo";
import LightsPipe from "./pipelines/lights";
import BloomPipeline from "./pipelines/bloomPipe";

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
interface DrawPointLight extends BaseDraw {
  intensity: number;
}
export type BatchType = "text" | "shape";
export interface GetBatch {
  type: BatchType;
  alpha?: number;
}
export interface BatchAccumulator {
  verticesData: number[];
  addData: number[];
  count: number;
  type: GetBatch["type"];
}
export default class Draw {
  public static hdrBloomTone(
    color: [number, number, number],
    emissive: number
  ): [number, number, number] {
    const [r, g, b] = color;
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const er = rn * emissive;
    const eg = gn * emissive;
    const eb = bn * emissive;

    const alpha = 1 / Math.pow(emissive, 3);
    const bleed = emissive * alpha;

    const rOut = (er + (1 - rn) * bleed) * 255;
    const gOut = (eg + (1 - gn) * bleed) * 255;
    const bOut = (eb + (1 - bn) * bleed) * 255;

    return [rOut, gOut, bOut];
  }
  public static rect({ position, size, tint, emissive = 1 }: DrawRect) {
    const pipeline = getDrawPipeline();
    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batch = pipeline.getBatch("shape", color[3]);
    const { addStride, vertexStride } = pipeline.getStride;

    AuroraCamera.setCameraBounds(position.y + size.height);
    batch.verticesData[batch.count * vertexStride] = position.x;
    batch.verticesData[batch.count * vertexStride + 1] = position.y;
    batch.verticesData[batch.count * vertexStride + 2] = size.width;
    batch.verticesData[batch.count * vertexStride + 3] = size.height;
    batch.verticesData[batch.count * vertexStride + 4] = 0;
    batch.verticesData[batch.count * vertexStride + 5] = 0;
    batch.verticesData[batch.count * vertexStride + 6] = 1;
    batch.verticesData[batch.count * vertexStride + 7] = 1;
    batch.addData[batch.count * addStride] = 0;
    batch.addData[batch.count * addStride + 1] = 0;
    batch.addData[batch.count * addStride + 2] = color[0];
    batch.addData[batch.count * addStride + 3] = color[1];
    batch.addData[batch.count * addStride + 4] = color[2];
    batch.addData[batch.count * addStride + 5] = color[3];
    batch.addData[batch.count * addStride + 6] = emissive;

    batch.count++;
    if (emissive !== 0) BloomPipeline.bloomInFrame = true;
    AuroraDebugInfo.accumulate("drawnQuads", 1);
  }

  public static circle({ position, size, tint, emissive = 1 }: DrawCircle) {
    const pipeline = getDrawPipeline();

    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batch = pipeline.getBatch("shape", color[3]);
    const { addStride, vertexStride } = pipeline.getStride;
    AuroraCamera.setCameraBounds(position.y + size.height);
    batch.verticesData[batch.count * vertexStride] = position.x;
    batch.verticesData[batch.count * vertexStride + 1] = position.y;
    batch.verticesData[batch.count * vertexStride + 2] = size.width;
    batch.verticesData[batch.count * vertexStride + 3] = size.height;
    batch.verticesData[batch.count * vertexStride + 4] = 0;
    batch.verticesData[batch.count * vertexStride + 5] = 0;
    batch.verticesData[batch.count * vertexStride + 6] = 1;
    batch.verticesData[batch.count * vertexStride + 7] = 1;

    batch.addData[batch.count * addStride] = 1;
    batch.addData[batch.count * addStride + 1] = 0;
    batch.addData[batch.count * addStride + 2] = color[0];
    batch.addData[batch.count * addStride + 3] = color[1];
    batch.addData[batch.count * addStride + 4] = color[2];
    batch.addData[batch.count * addStride + 5] = color[3];
    batch.addData[batch.count * addStride + 6] = emissive;
    batch.count++;
    AuroraDebugInfo.accumulate("drawnQuads", 1);
  }
  public static sprite({
    position,
    size,
    tint,
    crop,
    textureToUse,
    emissive = 1,
  }: DrawSprite) {
    const pipeline = getDrawPipeline();

    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const batch = pipeline.getBatch("shape", color[3]);
    const { addStride, vertexStride } = pipeline.getStride;
    AuroraCamera.setCameraBounds(position.y + size.height);
    const textureIndex = Batcher.getTextureIndex(textureToUse);
    batch.verticesData[batch.count * vertexStride] = position.x;
    batch.verticesData[batch.count * vertexStride + 1] = position.y;
    batch.verticesData[batch.count * vertexStride + 2] = size.width;
    batch.verticesData[batch.count * vertexStride + 3] = size.height;
    batch.verticesData[batch.count * vertexStride + 4] = crop.x;
    batch.verticesData[batch.count * vertexStride + 5] = crop.y;
    batch.verticesData[batch.count * vertexStride + 6] = crop.width;
    batch.verticesData[batch.count * vertexStride + 7] = crop.height;

    batch.addData[batch.count * addStride] = 2;
    batch.addData[batch.count * addStride + 1] = textureIndex;
    batch.addData[batch.count * addStride + 2] = color[0];
    batch.addData[batch.count * addStride + 3] = color[1];
    batch.addData[batch.count * addStride + 4] = color[2];
    batch.addData[batch.count * addStride + 5] = color[3];
    batch.addData[batch.count * addStride + 6] = emissive;

    batch.count++;
    AuroraDebugInfo.accumulate("drawnQuads", 1);
  }
  public static text({
    position,
    font,
    fontColor,
    fontSize,
    text,
    emissive = 1,
  }: DrawText) {
    const pipeline = getDrawPipeline();

    const fontData = Batcher.getUserFontData(font).getMeta;
    const fontIndex = Batcher.getUserFontData(font).getIndex;
    const { chars, kernings, lineHeight } = fontData;
    const scale = fontSize / lineHeight;
    const color: RGBA = fontColor ? fontColor : [255, 255, 255, 255];
    const { addStride, vertexStride } = pipeline.getStride;

    AuroraCamera.setCameraBounds(position.y + fontSize * (lineHeight * 2));

    const textMeasure = FontGen.measureText({ fontName: font, fontSize, text });
    const originX =
      Batcher.getBatcherOptions.drawOrigin === "center"
        ? textMeasure.width / 2
        : 0;
    const originY =
      Batcher.getBatcherOptions.drawOrigin === "center"
        ? textMeasure.height / 2
        : 0;
    let xCursor = position.x - originX;
    let yCursor = position.y - originY;

    let prevCharCode: number | null = null;

    for (const char of text) {
      const batch = pipeline.getBatch("text", color[3]);
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

      batch.verticesData[batch.count * vertexStride] = centerX;
      batch.verticesData[batch.count * vertexStride + 1] = centerY;
      batch.verticesData[batch.count * vertexStride + 2] = w;
      batch.verticesData[batch.count * vertexStride + 3] = h;
      batch.verticesData[batch.count * vertexStride + 4] = u;
      batch.verticesData[batch.count * vertexStride + 5] = v;
      batch.verticesData[batch.count * vertexStride + 6] = uWidth;
      batch.verticesData[batch.count * vertexStride + 7] = vHeight;

      batch.addData[batch.count * addStride] = fontIndex;
      batch.addData[batch.count * addStride + 1] = 0;
      batch.addData[batch.count * addStride + 2] = color[0];
      batch.addData[batch.count * addStride + 3] = color[1];
      batch.addData[batch.count * addStride + 4] = color[2];
      batch.addData[batch.count * addStride + 5] = color[3];
      batch.addData[batch.count * addStride + 6] = 1;

      batch.count++;
      AuroraDebugInfo.accumulate("drawnQuads", 1);

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
    const color: RGBA = tint ? tint : [255, 255, 255, 255];
    const { addStride, vertexStride } = LightsPipe.getStride;
    const { addArray, vertexArray } = LightsPipe.getDataArrays;
    const count = LightsPipe.getCount;
    vertexArray[count * vertexStride] = position.x;
    vertexArray[count * vertexStride + 1] = position.y;
    vertexArray[count * vertexStride + 2] = size.width;
    vertexArray[count * vertexStride + 3] = size.height;

    addArray[count * addStride] = intensity; // intens
    addArray[count * addStride + 1] = color[0];
    addArray[count * addStride + 2] = color[1];
    addArray[count * addStride + 3] = color[2];
    addArray[count * addStride + 4] = color[3];
    LightsPipe.addCount();
    AuroraDebugInfo.accumulate("drawnLights", 1);
  }
}
