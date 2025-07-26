import Aurora from "../../core";
import quad from "../shaders/drawQuad.wgsl?raw";
import circle from "../shaders/drawCircle.wgsl?raw";
import debugTextureShader from "../shaders/debugTexture.wgsl?raw";
import textShader from "../shaders/text.wgsl?raw";
import Batcher from "./batcher";
export function compileShaders() {
  const quadShader = Aurora.createShader("quadShader", quad);
  const circleShader = Aurora.createShader("circleShader", circle);
  const text = Aurora.createShader("textShader", textShader);
  const textureArr = Aurora.createShader(
    "displayTextureFromArray",
    debugTextureShader
  );

  Batcher.loadedShaders = new Map([
    ["quadShader", quadShader],
    ["circleShader", circleShader],
    ["textShader", text],
    ["textureFromArray", textureArr],
  ]);
}
