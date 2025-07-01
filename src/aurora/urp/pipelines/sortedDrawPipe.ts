import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraDebugInfo from "../debugger/debugInfo";
import AuroraCamera from "../camera";
import { BatchAccumulator, GetBatch } from "../draw";

interface DrawBatch {
  shape: BatchAccumulator[];
  text: BatchAccumulator[];
  transparent: BatchAccumulator[];
}
/**
 * Main sorted pipeline to draw shapes,sprites etc.
 */
export default class SortedDrawPipeline {
  private static BATCH_SIZE = 1000000; //assumption is - will never hit this amount xD maybe change later
  private static VERTEX_STRIDE = 8;
  private static ADD_STRIDE = 6;

  public static drawBatch: DrawBatch = {
    shape: [],
    text: [],
    transparent: [],
  };
  private static shapePipeline: GPURenderPipeline;
  private static textPipeline: GPURenderPipeline;
  private static transparentShapePipeline: GPURenderPipeline;
  private static transparentTextPipeline: GPURenderPipeline;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;

  public static get getStride() {
    return {
      vertexStride: this.VERTEX_STRIDE,
      addStride: this.ADD_STRIDE,
    };
  }

  public static async createPipeline() {
    const shapeSh = Batcher.getShader("shapeShader");
    const textSh = Batcher.getShader("textShader");

    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "sortedDrawVertexBuffer",
      dataLength: this.BATCH_SIZE * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
    this.addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "sortedDrawAddDataBuffer",
      dataLength: this.BATCH_SIZE * this.ADD_STRIDE,
      dataType: "Uint32Array",
    });
    const cameraBindLayout = AuroraCamera.getBuildInCameraBindGroupLayout;
    const userTextureLayout = Batcher.getUserTextureBindGroupLayout;
    const batcherOptionsLayout = Batcher.getBatcherOptionsGroupLayout;
    const textBindLayout = Batcher.getUserFontBindGroupLayout;

    const shapePipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      userTextureLayout,
      batcherOptionsLayout,
    ]);
    const textPipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      textBindLayout,
      batcherOptionsLayout,
    ]);

    const vertBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: this.VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // Position
        },
        {
          format: "float32x2",
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 1, // Size
        },
        {
          format: "float32x4",
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          shaderLocation: 2, // textureCrop
        },
      ],
    });
    const AddDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: this.ADD_STRIDE * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "uint32",
          offset: 0,
          shaderLocation: 3, // shapeType: 0 - rect, 1 - ellipse, 2 - sprite
        },
        {
          format: "uint32",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 4, //textureIndex
        },
        {
          format: "uint32x4",
          offset: 2 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 5, //tint
        },
      ],
    });
    const targets = AuroraDebugInfo.isWorking
      ? [
          Aurora.getColorTargetTemplate("standard"),
          Aurora.getColorTargetTemplate("zBufferDump"),
        ]
      : [Aurora.getColorTargetTemplate("standard")];
    this.shapePipeline = await Aurora.createRenderPipeline({
      shader: shapeSh,
      pipelineName: "sortedDrawShape",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: shapePipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: targets,
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "greater-equal",
      },
    });
    this.textPipeline = await Aurora.createRenderPipeline({
      shader: textSh,
      pipelineName: "sortedDrawText",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: textPipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: targets,
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "greater-equal",
      },
    });
    this.transparentShapePipeline = await Aurora.createRenderPipeline({
      shader: shapeSh,
      pipelineName: "ortedDrawTransparentShape",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: shapePipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: targets,
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "greater-equal",
      },
    });
    this.transparentTextPipeline = await Aurora.createRenderPipeline({
      shader: textSh,
      pipelineName: "sortedDrawTransparentText",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: textPipelineLayout,
      primitive: { topology: "triangle-list" },
      colorTargets: targets,
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "greater-equal",
      },
    });
  }

  private static createEmptyBatch(type: GetBatch["type"]): BatchAccumulator {
    return {
      verticesData: [],
      addData: [],
      count: 0,
      type,
    };
  }
  public static getBatch(type: GetBatch["type"], alpha: number) {
    const isTransparent = alpha !== 255;
    const key = isTransparent ? "transparent" : type;
    const batchAccumulator: BatchAccumulator[] = this.drawBatch[key];

    if (batchAccumulator.length === 0) {
      batchAccumulator.push(this.createEmptyBatch(type));
    }

    let batch = batchAccumulator.at(-1)!;
    if (AuroraDebugInfo.isWorking && batch.count >= this.BATCH_SIZE)
      throw new Error(
        `batch count in sortedDraw is more then theoretical limit you should never achieve \n count:${batch.count} \n limit:${this.BATCH_SIZE}`
      );

    if (batch.type !== type) {
      batchAccumulator.push(this.createEmptyBatch(type));
      batch = batchAccumulator.at(-1)!;
    }

    Batcher.pipelinesUsedInFrame.add("sortedDraw");
    return batch;
  }
  public static usePipeline() {
    const offscreenTexture = Batcher.getTextureView("offscreenCanvas");
    const zBufferTexture = Batcher.getTextureView("zBufferDump");
    const userTextureBind = Batcher.getUserTextureBindGroup;
    const fontBind = Batcher.getUserFontBindGroup;
    const indexBuffer = Batcher.getIndexBuffer;
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const batcherOptionsBind = Batcher.getBatcherOptionsBindGroup;
    let byteOffsetVert = 0;
    let byteOffsetAdd = 0;
    const colorAttachments: GPURenderPassColorAttachment[] = [
      {
        view: offscreenTexture,
        loadOp: "load",
        storeOp: "store",
      },
    ];
    if (AuroraDebugInfo.isWorking)
      colorAttachments.push({
        view: zBufferTexture,
        loadOp: "load",
        storeOp: "store",
      });
    const commandEncoder = Batcher.getEncoder;
    this.drawBatch.shape.forEach((batch, index) => {
      const vert = new Float32Array(batch.verticesData);
      const add = new Uint32Array(batch.addData);
      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        byteOffsetVert,
        vert,
        0
      );
      Aurora.device.queue.writeBuffer(this.addBuffer, byteOffsetAdd, add, 0);
      const passEncoder = commandEncoder.beginRenderPass({
        label: `SortedDrawShapeRenderPass:${index}`,
        colorAttachments: colorAttachments,
        depthStencilAttachment: {
          view: Batcher.getTextureView("depthTexture"),
          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });
      passEncoder.setPipeline(this.shapePipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer, byteOffsetVert);
      passEncoder.setVertexBuffer(1, this.addBuffer, byteOffsetAdd);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, userTextureBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);
      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      byteOffsetVert += vert.byteLength;
      byteOffsetAdd += add.byteLength;
      AuroraDebugInfo.accumulate("drawCalls", 1);
    });

    this.drawBatch.text.forEach((batch, index) => {
      const vert = new Float32Array(batch.verticesData);
      const add = new Uint32Array(batch.addData);

      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        byteOffsetVert,
        vert,
        0
      );
      Aurora.device.queue.writeBuffer(this.addBuffer, byteOffsetAdd, add, 0);

      const passEncoder = commandEncoder.beginRenderPass({
        label: `SortedDrawTextRenderPass:${index}`,

        colorAttachments: colorAttachments,
        depthStencilAttachment: {
          view: Batcher.getTextureView("depthTexture"),
          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });
      passEncoder.setPipeline(this.textPipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer, byteOffsetVert);
      passEncoder.setVertexBuffer(1, this.addBuffer, byteOffsetAdd);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, fontBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);

      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      byteOffsetVert += vert.byteLength;
      byteOffsetAdd += add.byteLength;
      AuroraDebugInfo.accumulate("drawCalls", 1);
    });

    this.drawBatch.transparent.forEach((batch, index) => {
      const pipeline =
        batch.type === "shape"
          ? this.transparentShapePipeline
          : this.transparentTextPipeline;
      const textureBind = batch.type === "shape" ? userTextureBind : fontBind;
      const { add, verts } = this.sortData(batch.verticesData, batch.addData);
      const vertArr = new Float32Array(verts);
      const addArr = new Uint32Array(add);

      Aurora.device.queue.writeBuffer(
        this.vertexBuffer,
        byteOffsetVert,
        vertArr,
        0
      );
      Aurora.device.queue.writeBuffer(this.addBuffer, byteOffsetAdd, addArr, 0);
      const passEncoder = commandEncoder.beginRenderPass({
        label: `SortedDrawTransparentRenderPass:${index}(${
          batch.type === "shape" ? "shape" : "text"
        })`,
        colorAttachments: colorAttachments,
        depthStencilAttachment: {
          view: Batcher.getTextureView("depthTexture"),
          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, this.vertexBuffer, byteOffsetVert);
      passEncoder.setVertexBuffer(1, this.addBuffer, byteOffsetAdd);
      passEncoder.setBindGroup(0, cameraBind);
      passEncoder.setBindGroup(1, textureBind);
      passEncoder.setBindGroup(2, batcherOptionsBind);

      passEncoder.setIndexBuffer(indexBuffer, "uint32");
      passEncoder.drawIndexed(6, batch.count);
      passEncoder.end();
      byteOffsetVert += vertArr.byteLength;
      byteOffsetAdd += addArr.byteLength;
      AuroraDebugInfo.accumulate("drawCalls", 1);
    });

    AuroraDebugInfo.accumulate("pipelineInUse", ["sortedDraw"]);
  }

  private static sortData(dataVert: number[], dataAdd: number[]) {
    if (dataVert.length % 8 !== 0 || dataAdd.length % 6 !== 0) {
      throw new Error("Transparent data is not multiple of 8 and 6");
    }
    const vertChunks: number[][] = [];
    const addChunks: number[][] = [];
    for (let i = 0; i < dataVert.length; i += 8) {
      vertChunks.push(dataVert.slice(i, i + 8));
    }
    for (let i = 0; i < dataAdd.length; i += 6) {
      addChunks.push(dataAdd.slice(i, i + 6));
    }
    const combined = vertChunks.map((vert, index) => ({
      vert,
      add: addChunks[index],
    }));
    combined.sort((a, b) => a.vert[1] - b.vert[1]);
    return {
      verts: combined.flatMap((c) => c.vert),
      add: combined.flatMap((c) => c.add),
    };
  }
  public static clearBatch() {
    this.drawBatch = {
      shape: [],
      text: [],
      transparent: [],
    };
  }
}
