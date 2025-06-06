import { DeepOmit } from "../../aurora";
import Aurora from "../../core";
export interface MsdfChar {
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
export interface FontData {
  lineHeight: number;
  chars: Record<number, MsdfChar>;
  kernings?: KerningMap;
  defaultChar: MsdfChar;
  bind: [GPUBindGroup, GPUBindGroupLayout];
  charCount: number;
  scale: { w: number; h: number };
}
interface Props {
  fontName: string;
  img: string;
  json: DeepOmit<FontJson, "chars.charIndex">;
}

export default class generateFont {
  name: Props["fontName"];
  imgUrl: Props["img"];
  jsonData: Props["json"];
  fontMeta!: FontData;
  //TODO: obecnie robisz jedna teksture zmaiast po prostu miec array tekstur w batcherze! potem to popraw
  //TODO: sampler przeniesc gdzies a nie tworzyc ciagle nowego
  //TODO: zrobic inicjacje za pomoca Font.generate() bo to musi byc await a konstruktor nie moze byc
  constructor({ fontName, img, json }: Props) {
    this.name = fontName;
    this.imgUrl = img;
    this.jsonData = json;
  }
  public get getMeta() {
    return this.fontMeta;
  }
  public getCharDataByCode(code: number) {
    return this.fontMeta?.chars[code];
  }

  async generateFont() {
    const sampler: GPUSampler = Aurora.createSampler({
      label: "msdf sampler",
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 16,
    });
    const u = 1 / this.jsonData.common.scaleW;
    const v = 1 / this.jsonData.common.scaleH;
    const data: number[] = [];
    (this.jsonData.chars as MsdfChar[]).forEach((c, i) => {
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
    console.log("data", data[16]);
    const buffer = Aurora.createMappedBuffer({
      bufferType: "storage",
      data: data,
      dataType: "Float32Array",
      label: `FontBuffer-${this.name}`,
    });
    const texture = await Aurora.createTexture({
      label: `MSDF font texture ${this.name}`,
      url: this.imgUrl,
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
    const chars = (this.jsonData.chars as MsdfChar[]).reduce<
      Record<number, MsdfChar>
    >((acc, c) => ({ ...acc, [c.id]: c }), {});
    const charArray = Object.values(chars);
    const kernings: KerningMap = new Map();
    if (this.jsonData.kernings) {
      this.jsonData.kernings.forEach((kerning) => {
        let kerningList = kernings.get(kerning.first);
        if (!kerningList) {
          kerningList = new Map();
          kernings.set(kerning.first, kerningList);
        }
        kerningList.set(kerning.second, kerning.amount);
      });
    }
    this.fontMeta = {
      bind: bindGroup,
      chars,
      kernings,
      lineHeight: this.jsonData.common.lineHeight,
      charCount: charArray.length,
      defaultChar: charArray[0],
      scale: { w: this.jsonData.common.scaleW, h: this.jsonData.common.scaleH },
    };
  }
}
