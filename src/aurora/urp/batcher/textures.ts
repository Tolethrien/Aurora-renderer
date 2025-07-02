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
    format: "bgra8unorm",
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

  const hdr = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "HDR",
  });
  Batcher.internatTextures.set("HDR", hdr);

  const bloomXOne = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "bloomXOne",
  });
  Batcher.internatTextures.set("bloomXOne", bloomXOne);

  const bloomYOne = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width,
      height: Aurora.canvas.height,
    },
    format: "rgba16float",
    label: "bloomYOne",
  });
  Batcher.internatTextures.set("bloomYOne", bloomYOne);

  const bloomXTwo = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width * 0.75,
      height: Aurora.canvas.height * 0.75,
    },
    format: "rgba16float",
    label: "bloomXTwo",
  });
  Batcher.internatTextures.set("bloomXTwo", bloomXTwo);

  const bloomYTwo = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width * 0.75,
      height: Aurora.canvas.height * 0.75,
    },
    format: "rgba16float",
    label: "bloomYTwo",
  });
  Batcher.internatTextures.set("bloomYTwo", bloomYTwo);

  const bloomXThree = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width * 0.5,
      height: Aurora.canvas.height * 0.5,
    },
    format: "rgba16float",
    label: "bloomXThree",
  });
  Batcher.internatTextures.set("bloomXThree", bloomXThree);

  const bloomYThree = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width * 0.5,
      height: Aurora.canvas.height * 0.5,
    },
    format: "rgba16float",
    label: "bloomYThree",
  });
  Batcher.internatTextures.set("bloomYThree", bloomYThree);

  const bloomXFour = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width * 0.25,
      height: Aurora.canvas.height * 0.25,
    },
    format: "rgba16float",
    label: "bloomXFour",
  });
  Batcher.internatTextures.set("bloomXFour", bloomXFour);

  const bloomYFour = Aurora.createTextureEmpty({
    size: {
      width: Aurora.canvas.width * 0.25,
      height: Aurora.canvas.height * 0.25,
    },
    format: "rgba16float",
    label: "bloomYFour",
  });
  Batcher.internatTextures.set("bloomYFour", bloomYFour);
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
}
