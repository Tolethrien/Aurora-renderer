import { HSLA, Position2D, Size2D } from "../aurora";
import Batcher from "./batcher";
import ShapePipe from "./pipelines/shapePipe";
import SpritePipe from "./pipelines/spritePipe";

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
export default class Draw {
  public static rect({ position, size, tint }: DrawRect) {
    const color: HSLA = tint ? tint : [255, 255, 255, 255];
    const batch = ShapePipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );
    Batcher.updateCameraBound(position.y + size.height * 0.5);
    batch.verts[batch.count * 4] = position.x;
    batch.verts[batch.count * 4 + 1] = position.y;
    batch.verts[batch.count * 4 + 2] = size.width;
    batch.verts[batch.count * 4 + 3] = size.height;

    batch.addData[batch.count * 5] = 0;
    batch.addData[batch.count * 5 + 1] = color[0];
    batch.addData[batch.count * 5 + 2] = color[1];
    batch.addData[batch.count * 5 + 3] = color[2];
    batch.addData[batch.count * 5 + 4] = color[3];
    batch.count++;
  }

  public static circle({ position, size, tint }: DrawCircle) {
    const color: HSLA = tint ? tint : [255, 255, 255, 255];
    const batch = ShapePipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );
    Batcher.updateCameraBound(position.y + size.height * 0.5);
    batch.verts[batch.count * 4] = position.x;
    batch.verts[batch.count * 4 + 1] = position.y;
    batch.verts[batch.count * 4 + 2] = size.width;
    batch.verts[batch.count * 4 + 3] = size.height;

    batch.addData[batch.count * 5] = 1;
    batch.addData[batch.count * 5 + 1] = color[0];
    batch.addData[batch.count * 5 + 2] = color[1];
    batch.addData[batch.count * 5 + 3] = color[2];
    batch.addData[batch.count * 5 + 4] = color[3];
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
    const batch = SpritePipe.getBatch(
      color[3] === 255 ? "opaque" : "transparent"
    );
    Batcher.updateCameraBound(position.y + size.height * 0.5);
    const textureIndex = Batcher.getTextureIndex(textureToUse);
    batch.verts[batch.count * 8] = position.x;
    batch.verts[batch.count * 8 + 1] = position.y;
    batch.verts[batch.count * 8 + 2] = size.width;
    batch.verts[batch.count * 8 + 3] = size.height;
    batch.verts[batch.count * 8 + 4] = crop.x;
    batch.verts[batch.count * 8 + 5] = crop.y;
    batch.verts[batch.count * 8 + 6] = crop.width;
    batch.verts[batch.count * 8 + 7] = crop.height;
    batch.addData[batch.count * 5] = textureIndex;
    batch.addData[batch.count * 5 + 1] = color[0];
    batch.addData[batch.count * 5 + 2] = color[1];
    batch.addData[batch.count * 5 + 3] = color[2];
    batch.addData[batch.count * 5 + 4] = color[3];
    batch.count++;
  }
}
