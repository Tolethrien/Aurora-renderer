import { HSLA, Position2D, Size2D } from "../aurora";
import Batcher from "./batcher";
import ShapePipe from "./pipelines/shapePipe";

interface BaseDraw {
  position: Position2D;
  size: Size2D;
  tint?: HSLA;
}
interface DrawRect extends BaseDraw {}
interface DrawCircle extends BaseDraw {}
interface DrawSprite extends BaseDraw {}
export default class Draw {
  public static rect({ position, size, tint }: DrawRect) {
    const batch = ShapePipe.getBatch();
    Batcher.updateCameraBound(position.y);
    batch.verts[batch.count * 4] = position.x;
    batch.verts[batch.count * 4 + 1] = position.y;
    batch.verts[batch.count * 4 + 2] = size.width;
    batch.verts[batch.count * 4 + 3] = size.height;
    const color: HSLA = tint ? tint : [1, 1, 1, 1];
    batch.addData[batch.count * 5] = 0;
    batch.addData[batch.count * 5 + 1] = color[0];
    batch.addData[batch.count * 5 + 2] = color[1];
    batch.addData[batch.count * 5 + 3] = color[2];
    batch.addData[batch.count * 5 + 4] = color[3];
    batch.count++;
  }

  public static circle({ position, size, tint }: DrawCircle) {
    const batch = ShapePipe.getBatch();
    Batcher.updateCameraBound(position.y);
    batch.verts[batch.count * 4] = position.x;
    batch.verts[batch.count * 4 + 1] = position.y;
    batch.verts[batch.count * 4 + 2] = size.width;
    batch.verts[batch.count * 4 + 3] = size.height;
    const color: HSLA = tint ? tint : [1, 1, 1, 1];
    batch.addData[batch.count * 5] = 1;
    batch.addData[batch.count * 5 + 1] = color[0];
    batch.addData[batch.count * 5 + 2] = color[1];
    batch.addData[batch.count * 5 + 3] = color[2];
    batch.addData[batch.count * 5 + 4] = color[3];
    batch.count++;
  }
}
