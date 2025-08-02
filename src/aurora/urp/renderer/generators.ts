import Aurora from "../../core";
import quad from "../shaders/draw/drawQuad.wgsl?raw";
import circle from "../shaders/draw/drawCircle.wgsl?raw";
import textShader from "../shaders/draw/drawText.wgsl?raw";
import { AuroraConfig } from "./config";
import { assert } from "../../../utils/utils";
import { Size2D } from "../../aurora";
export function generateInternalBuffers() {
  //main indexBuffer
  const index = Aurora.createMappedBuffer({
    data: [0, 1, 2, 1, 2, 3],
    bufferType: "index",
    dataType: "Uint32Array",
    label: "indexBuffer",
  });

  //bloom params buffer
  const bloomParams = Aurora.createBuffer({
    bufferType: "uniform",
    dataLength: 4,
    dataType: "Float32Array",
    label: "bloomParamsBuffer",
  });
  const cameraMatrix = Aurora.createBuffer({
    bufferType: "uniform",
    dataType: "Float32Array",
    dataLength: 16,
    label: "CameraBuffer",
  });
  const cameraBounds = Aurora.createBuffer({
    bufferType: "uniform",
    dataType: "Float32Array",
    dataLength: 2,
    label: "CameraBufferBound",
  });
  return new Map([
    ["index", index],
    ["bloomParams", bloomParams],
    ["cameraMatrix", cameraMatrix],
    ["cameraBounds", cameraBounds],
  ]);
}
export function generateInternalTextures(res: Size2D, bloomMip: number) {
  const canvasWidth = res.width;
  const canvasHeight = res.height;
  //offscreen - init texture
  // lights - all light baking
  // depth - zbuffer
  // zdump - debug dumping
  // bloom Threshold - like in name
  // bloomX - 4 mips
  // bloomY - 4 mips
  // pingpongA - texture to pingpong
  // pingpongB - texture to pingpong
  //finalDraw - combined offscreen and lights
  // ui
  // final (canvas)

  /**
   * draw na offscreen
   * draw swiatla na lights
   * if(debug) draw na zDump
   * draw offscreen + lights na finalDraw
   * finalDraw -> correction -> finalCorrectedDraw
   * finalCorrectedDraw -> threshold
   * postprocess pingpong
   * lastPing + ui -> screen
   *
   */

  const offscreen = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "rgba16float",
    label: "offscreenCanvas",
  });
  const finalDraw = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "rgba16float",
    label: "finalDraw",
    isStorage: true,
  });
  const depth = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "depth24plus",
    label: "z-buffer Texture",
  });

  const zdump = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "r16float",
    label: "zBufferDump",
  });

  const light = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "rgba16float",
    label: "lightMap",
  });
  //pre fill with "byte white" if there is no lighting pipeline use, so that shader can just multiply everything by 1 (empty would be 0)
  // there is no float16Array so i used uint16 and fill with "white half float" and then multiply by 2 for full float
  const pixels = new Uint16Array(canvasWidth * canvasHeight * 4).fill(0x3c00);
  Aurora.device.queue.writeTexture(
    {
      texture: light.texture,
    },
    pixels,
    {
      bytesPerRow: canvasWidth * 4 * 2,
      rowsPerImage: canvasHeight,
    },
    {
      width: canvasWidth,
      height: canvasHeight,
    }
  );

  const bloomThreshold = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "rgba16float",
    label: "bloomThreshold",
    isStorage: true,
  });
  const bloomEffect = Aurora.createTextureEmpty({
    size: {
      width: canvasWidth,
      height: canvasHeight,
    },
    format: "rgba16float",
    label: "bloomEffect",
    isStorage: true,
  });

  const bloomXPass = Aurora.createEmptyMipTexture({
    size: {
      w: canvasWidth / 2,
      h: canvasHeight / 2,
    },
    format: "rgba16float",
    label: "bloomXPass",
    isStorage: true,
    mipCount: bloomMip,
  });
  const bloomYPass = Aurora.createEmptyMipTexture({
    size: {
      w: canvasWidth / 2,
      h: canvasHeight / 2,
    },
    format: "rgba16float",
    label: "bloomYPass",
    isStorage: true,
    mipCount: bloomMip,
  });
  return new Map([
    ["offscreenCanvas", offscreen],
    ["finalDraw", finalDraw],
    ["depthTexture", depth],
    ["zBufferDump", zdump],
    ["lightMap", light],
    ["bloomThreshold", bloomThreshold],
    ["bloomEffect", bloomEffect],
    ["bloomXPass", bloomXPass],
    ["bloomYPass", bloomYPass],
  ]);
}
export function generateInternalSamplers() {
  const universal = Aurora.createSampler();
  const fontGen = Aurora.createSampler({
    label: "msdf sampler",
    minFilter: "linear",
    magFilter: "linear",
    mipmapFilter: "linear",
    maxAnisotropy: 16,
  });
  const sortedDrawZBuffer = Aurora.createSampler({ compare: "greater-equal" });
  const linear = Aurora.createSampler({
    label: "linear",
    minFilter: "linear",
    magFilter: "linear",
    mipmapFilter: "linear",
    maxAnisotropy: 1,
  });

  return new Map([
    ["universal", universal],
    ["fontGen", fontGen],
    ["sortedDrawZBuffer", sortedDrawZBuffer],
    ["linear", linear],
  ]);
}
export function compileShaders() {
  const quadShader = Aurora.createShader("quadShader", quad);
  const circleShader = Aurora.createShader("circleShader", circle);
  const text = Aurora.createShader("textShader", textShader);

  return new Map([
    ["quadShader", quadShader],
    ["circleShader", circleShader],
    ["textShader", text],
  ]);
}
