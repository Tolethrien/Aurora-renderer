import Aurora from "../../core";
import Batcher from "./batcher";
/**
 * generates internal textures needed to multiple batcher operation like bloom, post-process etc.
 */
export function generateInternalTextures() {
  Batcher.internatTextures.set(
    "offscreenCanvas",
    Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "bgra8unorm",
      label: "offscreenCanvas",
    })
  );
  Batcher.internatTextures.set(
    "depthTexture",
    Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "depth24plus",
      label: "z-buffer Texture",
    })
  );
  Batcher.internatTextures.set(
    "depthAccumulativeTexture",
    Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "rgba16float",
      label: "depthAccuTexture",
    })
  );
  Batcher.internatTextures.set(
    "depthRevealableTexture",
    Aurora.createTextureEmpty({
      size: {
        width: Aurora.canvas.width,
        height: Aurora.canvas.height,
      },
      format: "r16float",
      label: "depthReveTexture",
    })
  );
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
}
