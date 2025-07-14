import { PipelineBind } from "../../aurora";
import Aurora from "../../core";
import Batcher from "../batcher/batcher";
import AuroraCamera from "../camera";
import AuroraDebugInfo from "../debugger/debugInfo";
import lightsShader from "../shaders/light.wgsl?raw";

/**
 * Used to draw final offscreen onto canvas, possible post-proccesing like grayscale goes here too!
 */
export default class LightsPipe {
  private static BATCH_SIZE = 1000; //assumption is - will never hit this amount xD maybe change later
  private static VERTEX_STRIDE = 4;
  private static ADD_STRIDE = 5;
  private static pipeline: GPURenderPipeline;
  private static lightBind: PipelineBind;
  private static vertexBuffer: GPUBuffer;
  private static addBuffer: GPUBuffer;
  private static frameCount: number = 0;
  private static vertexArray: Float32Array = new Float32Array(
    this.BATCH_SIZE * this.VERTEX_STRIDE
  );
  private static addDataArray: Uint32Array = new Uint32Array(
    this.BATCH_SIZE * this.ADD_STRIDE
  );
  public static get getStride() {
    return {
      vertexStride: this.VERTEX_STRIDE,
      addStride: this.ADD_STRIDE,
    };
  }
  public static get getDataArrays() {
    return {
      vertexArray: this.vertexArray,
      addArray: this.addDataArray,
    };
  }
  public static get getCount() {
    return this.frameCount;
  }
  public static addCount() {
    this.frameCount++;
    Batcher.pipelinesUsedInFrame.add("lights");
  }
  public static async createPipeline() {
    const shader = Aurora.createShader("lightsShader", lightsShader);
    const cameraBindLayout = AuroraCamera.getBuildInCameraBindGroupLayout;

    this.vertexBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "lightVertexBuffer",
      dataLength: this.BATCH_SIZE * this.VERTEX_STRIDE,
      dataType: "Float32Array",
    });
    this.addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "lightsAddBuffer",
      dataLength: this.BATCH_SIZE * this.ADD_STRIDE,
      dataType: "Uint32Array",
    });
    this.lightBind = Aurora.creteBindGroup({
      layout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: "2d" },
          },
        ],
        label: "lightsBindLayout",
      },
      data: {
        label: "lightsBindData",
        entries: [
          { binding: 0, resource: Batcher.getSampler("universal") },

          {
            binding: 1,
            resource: Batcher.getTextureView("offscreenCanvas"),
          },
        ],
      },
    });
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
      ],
    });
    const AddDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: this.ADD_STRIDE * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "uint32",
          offset: 0,
          shaderLocation: 2, //intensity
        },
        {
          format: "uint32x4",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 3, //tint
        },
      ],
    });

    const pipelineLayout = Aurora.createPipelineLayout([
      cameraBindLayout,
      this.lightBind[1],
    ]);
    this.pipeline = await Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "lightsPipeline",
      buffers: [vertBuffLay, AddDataBuffLay],
      pipelineLayout: pipelineLayout,
      colorTargets: [Aurora.getColorTargetTemplate("additive")],
    });
  }
  public static clearBatch() {
    this.frameCount = 0;
  }
  public static usePipeline(): void {
    const cameraBind = AuroraCamera.getBuildInCameraBindGroup;
    const indexBuffer = Batcher.getIndexBuffer;
    const commandEncoder = Batcher.getEncoder;
    const correction = Batcher.getNormalizedColorCorrection;
    Aurora.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertexArray, 0);
    Aurora.device.queue.writeBuffer(this.addBuffer, 0, this.addDataArray, 0);

    const passEncoder = commandEncoder.beginRenderPass({
      label: "lightsRenderPass",
      colorAttachments: [
        {
          view: Batcher.getTextureView("lightMap"),
          clearValue: [...correction, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, cameraBind);
    passEncoder.setBindGroup(1, this.lightBind[0]);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setVertexBuffer(1, this.addBuffer);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, this.frameCount);
    passEncoder.end();
    AuroraDebugInfo.accumulate("drawCalls", 1);

    AuroraDebugInfo.accumulate("pipelineInUse", ["lights"]);
  }
}
