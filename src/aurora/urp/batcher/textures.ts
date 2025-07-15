import Aurora from "../../core";
import Batcher from "./batcher";
/**
 * generates internal textures needed to multiple batcher operation like bloom, post-process etc.
 */
export function generateInternalTextures() {
  const offscreen = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "offscreenCanvas",
  });
  Batcher.internatTextures.set("offscreenCanvas", offscreen);
  const depth = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "depth24plus",
    label: "z-buffer Texture",
  });
  Batcher.internatTextures.set("depthTexture", depth);

  const zdump = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "r16float",
    label: "zBufferDump",
  });
  Batcher.internatTextures.set("zBufferDump", zdump);

  const light = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "bgra8unorm",
    label: "lightMap",
  });
  Batcher.internatTextures.set("lightMap", light);

  const bloomThreshold = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "bloomThreshold",
    isStorage: true,
  });
  Batcher.internatTextures.set("bloomThreshold", bloomThreshold);

  const bloomXPass = Aurora.createEmptyMipTexture({
    size: {
      w: Aurora.canvas.width,
      h: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "bloomXPass",
    isStorage: true,
    mipCount: 4,
  });
  Batcher.internatTextures.set("bloomXPass", bloomXPass);
  const bloomYPass = Aurora.createEmptyMipTexture({
    size: {
      w: Aurora.canvas.width,
      h: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "bloomYPass",
    isStorage: true,
    mipCount: 4,
  });
  Batcher.internatTextures.set("bloomYPass", bloomYPass);
}
/**
 * generates internal samplers for textures
 */
export function generateInternalSamplers() {
  Batcher.internatSamplers.set("universal", Aurora.createSampler());
  Batcher.internatSamplers.set(
    "fontGen",
    Aurora.createSampler({
      label: "msdf sampler",
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 16,
    })
  );
  Batcher.internatSamplers.set(
    "sortedDrawZBuffer",
    Aurora.createSampler({ compare: "greater-equal" })
  );
  Batcher.internatSamplers.set(
    "linear",
    Aurora.createSampler({
      label: "linear",
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 1,
    })
  );
}

export function clearTextureBuffer() {
  const bytesPerRow = Math.ceil((8 * Aurora.canvas.width) / 256) * 256;
  const bufferSize = bytesPerRow * Aurora.canvas.height;
  const zeroBuf = Aurora.device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  new Uint8Array(zeroBuf.getMappedRange()).fill(0);
  zeroBuf.unmap();
  return zeroBuf;
}
