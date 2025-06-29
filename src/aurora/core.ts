import { assert, loadImg } from "../utils/utils";
import type {
  AuroraComputePipeline,
  AuroraRenderPipeline,
  BufferOptions,
  ColorAttachments,
  CreateBindGroup,
  GenerateGPUTextureProps,
  GPUAuroraTexture,
  MappedBufferOptions,
  TextureArrayProps,
  TextureEmptyProps,
  TextureProps,
} from "./aurora";
export const TYPED_MAP = {
  Float32Array,
  Float64Array,
  Uint16Array,
  Uint32Array,
  Uint8Array,
};
export const USAGE_MAP = {
  dynamic: {
    vertex: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    index: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    storage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    uniform: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  },
  mapped: {
    vertex: GPUBufferUsage.VERTEX,
    index: GPUBufferUsage.INDEX,
    storage: GPUBufferUsage.STORAGE,
    uniform: GPUBufferUsage.UNIFORM,
  },
};
export default class Aurora {
  public static adapter: GPUAdapter;
  public static device: GPUDevice;
  public static canvas: HTMLCanvasElement;
  public static context: GPUCanvasContext;
  public static async init() {
    const canvas = document.getElementById("gameWindow") as HTMLCanvasElement;
    this.canvas = canvas;
    const ctx = canvas.getContext("webgpu");
    assert(ctx !== null, "there is no WebGpu context in canvas");
    this.context = ctx;
    assert(
      navigator.gpu !== undefined,
      "WebGPU is not supported on this browser."
    );

    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter !== null, "Failed to get GPU adapter.");
    this.adapter = adapter;
    this.device = await adapter.requestDevice({
      requiredFeatures: ["timestamp-query"],
    });

    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({
      device: this.device,
      format: format,
      alphaMode: "opaque",
    });
  }
  //TODO: co robi dokladniej dynamiczny opisz
  public static createBuffer(settings: BufferOptions) {
    const buffer = this.device.createBuffer({
      label: settings.label ?? "generic vertex buffer",
      size:
        TYPED_MAP[settings.dataType].BYTES_PER_ELEMENT * settings.dataLength,
      usage: USAGE_MAP.dynamic[settings.bufferType],
    });
    return buffer;
  }
  //TODO: co robi dokladniej Mapowany opisz
  public static createMappedBuffer(settings: MappedBufferOptions) {
    const buffer = this.device.createBuffer({
      label: settings.label ?? "generic vertex buffer",
      size:
        TYPED_MAP[settings.dataType].BYTES_PER_ELEMENT * settings.data.length,
      usage: USAGE_MAP.mapped[settings.bufferType],
      mappedAtCreation: true,
    });
    new TYPED_MAP[settings.dataType](buffer.getMappedRange()).set(
      settings.data
    );
    buffer.unmap();
    return buffer;
  }
  public static createShader(shaderName: string, shaderCode: string) {
    return this.device.createShaderModule({
      label: shaderName,
      code: shaderCode,
    });
  }
  public static createSampler(desc?: GPUSamplerDescriptor) {
    return this.device.createSampler(desc);
  }
  public static createPipelineLayout(bindGLayout: GPUBindGroupLayout[]) {
    return this.device.createPipelineLayout({ bindGroupLayouts: bindGLayout });
  }
  public static createComputePipeline(props: AuroraComputePipeline) {
    return this.device.createComputePipeline({
      layout: props.pipelineLayout,
      label: props.pipelineName,
      compute: {
        module: props.shader,
        entryPoint: "computeMain",
      },
    });
  }
  public static createRenderPipeline(props: AuroraRenderPipeline) {
    return this.device.createRenderPipelineAsync({
      label: props.pipelineName,
      layout: props.pipelineLayout,
      vertex: {
        module: props.shader,
        entryPoint: "vertexMain",
        buffers: props.buffers,
      },
      primitive: props.primitive,
      fragment: {
        module: props.shader,
        entryPoint: "fragmentMain",
        targets: props.colorTargets ?? [
          this.getColorTargetTemplate("standard"),
        ],
      },
      depthStencil: props.depthStencil,
    });
  }
  public static createVertexBufferLayout(layout: GPUVertexBufferLayout) {
    return layout;
  }
  public static creteBindGroup({
    layout,
    data,
  }: CreateBindGroup): [GPUBindGroup, GPUBindGroupLayout] {
    const bindLayout = this.device.createBindGroupLayout(layout);
    const bindGroup = this.device.createBindGroup({
      entries: data.entries,
      layout: bindLayout,
      label: data.label,
    });
    return [bindGroup, bindLayout];
  }
  public static swapBindGroupData(
    data: CreateBindGroup["data"],
    layout: GPUBindGroupLayout
  ) {
    const bindGroup = this.device.createBindGroup({
      entries: data.entries,
      layout: layout,
      label: data.label,
    });
    return bindGroup;
  }
  public static getColorTargetTemplate(
    type: ColorAttachments
  ): GPUColorTargetState {
    switch (type) {
      case "standard":
        return {
          format: navigator.gpu.getPreferredCanvasFormat(),
          writeMask: GPUColorWrite.ALL,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        };
      case "HDR":
        return {
          format: "rgba16float",
          writeMask: GPUColorWrite.ALL,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        };
      case "zBufferDump":
        return {
          format: "r16float",
          writeMask: GPUColorWrite.RED,
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "zero",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "zero",
              operation: "add",
            },
          },
        };
      default:
        return {
          format: navigator.gpu.getPreferredCanvasFormat(),
          writeMask: GPUColorWrite.ALL,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        };
    }
  }
  public static createTextureEmpty({
    label,
    format,
    size,
    isStorage = false,
  }: TextureEmptyProps) {
    const gpuTexture = this.generateGPUTexture({
      label,
      size: { w: size.width, h: size.height },
      format,
      isStorage: isStorage,
    });

    const textureData: GPUAuroraTexture = {
      texture: gpuTexture,
      label,
      meta: {
        height: gpuTexture.height,
        width: gpuTexture.width,
        arrayTextureLength: 1,
        src: new Map([
          [
            label,
            {
              height: gpuTexture.height,
              width: gpuTexture.width,
              src: "empty",
            },
          ],
        ]),
      },
    };
    return textureData;
  }
  public static async createTexture({
    format,
    label,
    url,
    flipY,
  }: TextureProps) {
    const img = await loadImg(url);
    const bitmap = await createImageBitmap(img);
    const gpuTexture = this.generateGPUTexture({
      label,
      size: { w: bitmap.width, h: bitmap.height },
      format,
    });

    Aurora.device.queue.copyExternalImageToTexture(
      { source: bitmap, flipY: flipY },
      { texture: gpuTexture },
      {
        width: bitmap.width,
        height: bitmap.height,
      }
    );
    const textureData: GPUAuroraTexture = {
      texture: gpuTexture,
      label,
      meta: {
        height: gpuTexture.height,
        width: gpuTexture.width,
        arrayTextureLength: 1,
        src: new Map([
          [
            label,
            {
              height: bitmap.height,
              width: bitmap.width,
              src: url,
            },
          ],
        ]),
      },
    };
    return textureData;
  }
  public static async createTextureArray({
    format,
    label,
    textures,
    flipY,
  }: TextureArrayProps) {
    assert(
      textures.length > 1,
      `AuroraTexture Error: Textures length too short\nTexture Label: ${label}\nMinimal Textures in Array: 2\nActual Textures added: ${textures.length}`
    );
    const bitmaps: ImageBitmap[] = [];
    for (const { url } of textures) {
      const img = await loadImg(url);
      const bitmap = await createImageBitmap(img);
      bitmaps.push(bitmap);
    }

    const { textureHeight, textureWidth } = this.calculateDimension(bitmaps);
    const gpuTexture = this.generateGPUTexture({
      label,
      size: { w: textureWidth, h: textureHeight, z: textures.length },
      format,
    });

    const textureData: GPUAuroraTexture = {
      texture: gpuTexture,
      label,
      meta: {
        height: gpuTexture.height,
        width: gpuTexture.width,

        src: new Map(),
        arrayTextureLength: bitmaps.length,
      },
    };
    bitmaps.forEach((bitMap, index) => {
      textureData.meta.src.set(textures[index].name, {
        width: bitMap.width,
        height: bitMap.height,
        index,
        name: textures[index].name,
        src: textures[index].url,
      });
      Aurora.device.queue.copyExternalImageToTexture(
        { source: bitMap, flipY: flipY },
        { texture: gpuTexture, origin: { z: index } },
        {
          width: bitMap.width,
          height: bitMap.height,
        }
      );
    });

    return textureData;
  }
  private static calculateDimension(textures: ImageBitmap[]) {
    let textureWidth = 0;
    let textureHeight = 0;

    textures.forEach((bitmap) => {
      textureWidth = Math.max(bitmap.width, textureWidth);
      textureHeight = Math.max(bitmap.height, textureHeight);
    });
    return { textureWidth, textureHeight };
  }
  private static generateGPUTexture({
    format,
    size,
    label,
    isStorage,
  }: GenerateGPUTextureProps) {
    let usage =
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.RENDER_ATTACHMENT;
    if (isStorage) usage |= GPUTextureUsage.STORAGE_BINDING;
    return Aurora.device.createTexture({
      format: format ?? "bgra8unorm",
      size: {
        width: size.w,
        height: size.h,
        depthOrArrayLayers: size.z ?? 1,
      },
      label,
      usage,
    });
  }
}
