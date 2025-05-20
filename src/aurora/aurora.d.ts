import { TYPED_MAP } from "./core";
type bufferType = "vertex" | "index" | "storage" | "uniform";
interface SharedBufferOptions {
  label: string;
  bufferType: bufferType;
  dataType: keyof typeof TYPED_MAP;
}
interface BufferOptions extends SharedBufferOptions {
  dataLength: number;
}
interface MappedBufferOptions extends SharedBufferOptions {
  data: number[];
}
interface AuroraRenderPipeline {
  pipelineName: string;
  pipelineLayout: GPUPipelineLayout;
  shader: GPUShaderModule;
  buffers: GPUVertexBufferLayout[];
  colorTargets?: GPUColorTargetState[];
  depthStencil?: GPUDepthStencilState;
  primitive?: GPUPrimitiveState;
}
interface AuroraComputePipeline {
  pipelineName: string;
  pipelineLayout: GPUPipelineLayout;
  shader: GPUShaderModule;
}
type ColorAttachments =
  | "overSaturated"
  | "standard"
  | "storage-read-write"
  | "post-process"
  | "test-standard"
  | "OITAccu"
  | "OITReve";
interface CreateBindGroup {
  name: string;
  layout: GPUBindGroupLayoutDescriptor;
  data: { entries: Iterable<GPUBindGroupEntry>; label?: string };
}
interface BaseTextureProps {
  format?: GPUTextureFormat;
  label: string;
}
interface TextureEmptyProps extends BaseTextureProps {
  size: Size2D;
  isStorage?: boolean;
}
interface TextureProps extends BaseTextureProps {
  url: string;
  flipY?: boolean;
}
interface TextureArrayProps extends BaseTextureProps {
  textures: { name: string; url: string }[];
  flipY?: boolean;
}
interface GenerateGPUTextureProps {
  format?: GPUTextureFormat;
  size: { w: number; h: number; z?: number };
  label: string;
  isStorage?: boolean;
}
interface GPUAuroraTexture {
  texture: GPUTexture;
  label: string;
  meta: {
    src: Map<string, ImgMeta>;
    width: number;
    height: number;
    arrayTextureLength: number;
  };
}
type Size2D = { width: number; height: number };
type Position2D = { x: number; y: number };
type HSLA = [number, number, number, number];
