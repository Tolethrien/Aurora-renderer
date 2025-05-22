import { loadImg } from "../../../utils/utils";
import { DeepOmit } from "../../aurora";
import Aurora from "../../core";
interface MsdfChar {
  id: number;
  index: number;
  char: string;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  chnl: number;
  x: number;
  y: number;
  page: number;
  charIndex: number;
}
interface KerningChar {
  first: number;
  second: number;
  amount: number;
}
interface FontJson {
  chars: MsdfChar[];
  kernings?: KerningChar[];
  common: {
    lineHeight: number;
    scaleW: number;
    scaleH: number;
  };
}
type KerningMap = Map<number, Map<number, number>>;
interface FontData {
  lineHeight: number;
  chars: Record<number, MsdfChar>;
  kernings?: KerningMap;
  defaultChar: MsdfChar;
  bind: [GPUBindGroup, GPUBindGroupLayout];
  charCount: number;
}

export default class generateFont {
  name: string;

  //TODO: obecnie robisz jedna teksture zmaiast po prostu miec array tekstur w batcherze! potem to popraw
  //TODO: sampler przeniesc gdzies a nie tworzyc ciagle nowego
  constructor(fontName: string) {
    this.name = fontName;
  }
  //   getChar(charCode: number): MsdfChar {
  //     let char = this.chars[charCode];
  //     if (!char) char = this.defaultChar;
  //     return char;
  //   }

  //   getXAdvance(charCode: number, nextCharCode: number = -1): number {
  //     const char = this.getChar(charCode);
  //     if (nextCharCode >= 0) {
  //       const kerning = this.kernings.get(charCode);
  //       if (kerning) return char.xadvance + (kerning.get(nextCharCode) ?? 0);
  //     }
  //     return char.xadvance;
  //   }
  async createFont({
    img,
    json,
  }: {
    img: string;
    json: DeepOmit<FontJson, "chars.charIndex">;
  }): Promise<FontData> {
    // const image = await loadImg(img);
    const sampler: GPUSampler = Aurora.createSampler({
      label: "msdf sampler",
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 16,
    });
    const u = 1 / json.common.scaleW;
    const v = 1 / json.common.scaleH;
    const data: number[] = [];
    (json.chars as MsdfChar[]).forEach((c, i) => {
      const offset = i * 8;
      data[offset] = c.x * u;
      data[offset + 1] = c.y * v;
      data[offset + 2] = c.width * u;
      data[offset + 3] = c.height * v;
      data[offset + 4] = c.width;
      data[offset + 5] = c.height;
      data[offset + 6] = c.xoffset;
      data[offset + 7] = -c.yoffset;
      c.charIndex = i;
    });
    const buffer = Aurora.createMappedBuffer({
      bufferType: "storage",
      data: data,
      dataType: "Float32Array",
      label: `FontBuffer-${this.name}`,
    });
    const texture = await Aurora.createTexture({
      label: `MSDF font texture ${this.name}`,
      url: img,
      format: "rgba8unorm",
    });
    const bindGroup = Aurora.creteBindGroup({
      layout: {
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
          {
            binding: 2,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "read-only-storage" },
          },
        ],
        label: `font-${this.name} BindLayout`,
      },
      data: {
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.texture.createView() },
          { binding: 2, resource: { buffer: buffer } },
        ],
        label: `font-${this.name} BindData`,
      },
    });
    const chars = json.chars.reduce<Record<number, MsdfChar>>(
      (acc: any, c: any) => ({ ...acc, [c.id]: c }),
      {}
    );
    const charArray = Object.values(chars);
    const kernings: KerningMap = new Map();
    if (json.kernings) {
      json.kernings.forEach((kerning) => {
        let kerningList = kernings.get(kerning.first);
        if (!kerningList) {
          kerningList = new Map();
          kernings.set(kerning.first, kerningList);
        }
        kerningList.set(kerning.second, kerning.amount);
      });
    }
    return {
      bind: bindGroup,
      chars,
      kernings,
      lineHeight: json.common.lineHeight,
      charCount: charArray.length,
      defaultChar: charArray[0],
    };
  }
}
