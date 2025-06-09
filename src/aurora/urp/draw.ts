import { HSLA, Position2D, Size2D } from "../aurora";
import Batcher from "./batcher";
import { MsdfChar } from "./msdf/generateFont";
import ShapePipe from "./pipelines/shapePipe";
import SpritePipe from "./pipelines/spritePipe";
import TextPipe from "./pipelines/textPipe";

interface BaseDraw {
  position: Position2D;
  size: Size2D;
  tint?: HSLA;
}
interface DrawRect extends BaseDraw {}
interface DrawCircle extends BaseDraw {}
interface DrawSprite extends BaseDraw {
  crop: Position2D & Size2D;
  textureToUse: string;
}
interface DrawText {
  position: Position2D;
  text: string;
  font: string;
  fontSize: number;
  fontColor?: HSLA;
}
export default class Draw {
  public static rect({ position, size, tint }: DrawRect) {
    const color: HSLA = tint ? tint : [255, 255, 255, 255];
    const batch = ShapePipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );
    const { addStride, vertexStride } = ShapePipe.getStride;
    Batcher.updateCameraBound(position.y + size.height * 0.5);
    batch.verts[batch.count * vertexStride] = position.x;
    batch.verts[batch.count * vertexStride + 1] = position.y;
    batch.verts[batch.count * vertexStride + 2] = size.width;
    batch.verts[batch.count * vertexStride + 3] = size.height;
    batch.verts[batch.count * vertexStride + 4] = 0;
    batch.verts[batch.count * vertexStride + 5] = 0;
    batch.verts[batch.count * vertexStride + 6] = 1;
    batch.verts[batch.count * vertexStride + 7] = 1;

    batch.addData[batch.count * addStride] = 0;
    batch.addData[batch.count * addStride + 1] = 0;
    batch.addData[batch.count * addStride + 2] = color[0];
    batch.addData[batch.count * addStride + 3] = color[1];
    batch.addData[batch.count * addStride + 4] = color[2];
    batch.addData[batch.count * addStride + 5] = color[3];
    batch.count++;
  }

  public static circle({ position, size, tint }: DrawCircle) {
    const color: HSLA = tint ? tint : [255, 255, 255, 255];
    const batch = ShapePipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );
    const { addStride, vertexStride } = ShapePipe.getStride;
    Batcher.updateCameraBound(position.y + size.height * 0.5);
    batch.verts[batch.count * vertexStride] = position.x;
    batch.verts[batch.count * vertexStride + 1] = position.y;
    batch.verts[batch.count * vertexStride + 2] = size.width;
    batch.verts[batch.count * vertexStride + 3] = size.height;
    batch.verts[batch.count * vertexStride + 4] = 0;
    batch.verts[batch.count * vertexStride + 5] = 0;
    batch.verts[batch.count * vertexStride + 6] = 1;
    batch.verts[batch.count * vertexStride + 7] = 1;

    batch.addData[batch.count * addStride] = 1;
    batch.addData[batch.count * addStride + 1] = 0;
    batch.addData[batch.count * addStride + 2] = color[0];
    batch.addData[batch.count * addStride + 3] = color[1];
    batch.addData[batch.count * addStride + 4] = color[2];
    batch.addData[batch.count * addStride + 5] = color[3];
    batch.count++;
  }
  public static sprite({
    position,
    size,
    tint,
    crop,
    textureToUse,
  }: DrawSprite) {
    const color: HSLA = tint ? tint : [255, 255, 255, 255];
    const batch = ShapePipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );
    const { addStride, vertexStride } = ShapePipe.getStride;
    Batcher.updateCameraBound(position.y + size.height * 0.5);
    const textureIndex = Batcher.getTextureIndex(textureToUse);
    batch.verts[batch.count * vertexStride] = position.x;
    batch.verts[batch.count * vertexStride + 1] = position.y;
    batch.verts[batch.count * vertexStride + 2] = size.width;
    batch.verts[batch.count * vertexStride + 3] = size.height;
    batch.verts[batch.count * vertexStride + 4] = crop.x;
    batch.verts[batch.count * vertexStride + 5] = crop.y;
    batch.verts[batch.count * vertexStride + 6] = crop.width;
    batch.verts[batch.count * vertexStride + 7] = crop.height;

    batch.addData[batch.count * addStride] = 2;
    batch.addData[batch.count * addStride + 1] = textureIndex;
    batch.addData[batch.count * addStride + 2] = color[0];
    batch.addData[batch.count * addStride + 3] = color[1];
    batch.addData[batch.count * addStride + 4] = color[2];
    batch.addData[batch.count * addStride + 5] = color[3];
    batch.count++;
  }
  public static text({ position, font, fontColor, fontSize, text }: DrawText) {
    console.log(text);
    const fontData = Batcher.textData.getMeta;
    if (!fontData) return;
    const { chars, kernings, lineHeight } = fontData;
    const scale = (fontSize * 1.5) / lineHeight;

    const color: HSLA = fontColor ? fontColor : [255, 255, 255, 255];
    const batch = TextPipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );

    Batcher.updateCameraBound(position.y + fontSize * 4);

    let xCursor = position.x;
    let yCursor = position.y;

    let prevCharCode: number | null = null;

    for (const char of text) {
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

      // const x0 = xCursor + charData.xoffset * scale;
      // const y0 = yCursor + charData.yoffset * scale;
      const x0 = xCursor + charData.xoffset * scale;
      const y0 = yCursor + charData.yoffset * scale;

      // **Re-compute so that we send the _center_**, not the top-left.
      const centerX = x0 + w * 0.5;
      const centerY = y0 + h * 0.5;
      const u = charData.x / fontData.scale.w;
      const v = charData.y / fontData.scale.h;
      const uWidth = charData.width / fontData.scale.w;
      const vHeight = charData.height / fontData.scale.h;

      const baseIndex = batch.count * 8;
      batch.verts[baseIndex + 0] = centerX;
      batch.verts[baseIndex + 1] = centerY;
      batch.verts[baseIndex + 2] = w;
      batch.verts[baseIndex + 3] = h;
      batch.verts[baseIndex + 4] = u;
      batch.verts[baseIndex + 5] = v;
      batch.verts[baseIndex + 6] = uWidth;
      batch.verts[baseIndex + 7] = vHeight;
      batch.verts[baseIndex + 8] = vHeight;

      const addBase = batch.count * 5;
      batch.addData[addBase + 0] = /* textureIndex */ 0;
      batch.addData[addBase + 1] = color[0];
      batch.addData[addBase + 2] = color[1];
      batch.addData[addBase + 3] = color[2];
      batch.addData[addBase + 4] = color[3];

      batch.count++;

      xCursor += charData.xadvance * scale;
      prevCharCode = code;
    }
  }
}
