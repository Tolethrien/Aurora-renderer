import Aurora from "../../core";
import shapeShader from "../shaders/shape.wgsl?raw";
import textShader from "../shaders/text.wgsl?raw";
import Batcher from "./batcher";
export function compileShaders() {
  const shape = Aurora.createShader("shapeShader", shapeShader);
  const text = Aurora.createShader("textShader", textShader);
  Batcher.loadedShaders = new Map([
    ["shapeShader", shape],
    ["textShader", text],
  ]);
}
