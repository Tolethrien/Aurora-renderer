import { HSLA, Position2D } from "../../aurora";
import Aurora from "../../core";
import AuroraCamera from "../camera";
import temp from "../shaders/shape.wgsl?raw";

interface CharVert {
  charCode: number;
  color: HSLA;
  position: Position2D;
  fontSize: number;
}
export default class TextPipe {
  public static create() {
    const commandEncoder = Aurora.device.createCommandEncoder();
    const textureView = Aurora.context.getCurrentTexture().createView();
    const verts = new Float32Array([200, 200]); //position
    const addData = new Uint32Array([71, 1, 1, 1, 1, 16]); // charcode,color,fontsize

    const shader = Aurora.createShader("temp", temp);
    const indexBuffer = Aurora.createMappedBuffer({
      data: [0, 1, 2, 1, 2, 3],
      bufferType: "index",
      dataType: "Uint32Array",
      label: "indexBuffer",
    });
    const vertBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "VertexBuffer",
      dataLength: verts.length,
      dataType: "Float32Array",
    });
    const addBuffer = Aurora.createBuffer({
      bufferType: "vertex",
      label: "addDataBuffer",
      dataLength: addData.length,
      dataType: "Uint32Array",
    });
    const cameraBuffer = Aurora.createBuffer({
      bufferType: "uniform",
      dataType: "Float32Array",
      dataLength: 16,
      label: "CameraBuffer",
    });

    Aurora.device.queue.writeBuffer(
      cameraBuffer,
      0,
      AuroraCamera.getProjectionViewMatrix.getMatrix
    );
    const [cameraBindGroup, cameraBindLayout] = Aurora.creteBindGroup({
      name: "cameraBind",
      layout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
          },
        ],
        label: "cameraBindLayout",
      },
      data: {
        label: "cameraBindData",
        entries: [{ binding: 0, resource: { buffer: cameraBuffer } }],
      },
    });
    const pipelineLayout = Aurora.createPipelineLayout([cameraBindLayout]);
    const vertBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // Position, see vertex shader
        },
      ],
    });
    const addDataBuffLay = Aurora.createVertexBufferLayout({
      arrayStride: 6 * Uint32Array.BYTES_PER_ELEMENT,
      stepMode: "instance",
      attributes: [
        {
          format: "uint32",
          offset: 0,
          shaderLocation: 1, // charcode
        },
        {
          format: "uint32x4",
          offset: 1 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 2, //color
        },
        {
          format: "uint32",
          offset: 5 * Uint32Array.BYTES_PER_ELEMENT,
          shaderLocation: 3, //size
        },
      ],
    });
    const pipeline = Aurora.createRenderPipeline({
      shader: shader,
      pipelineName: "main",
      buffers: [vertBuffLay, addDataBuffLay],
      pipelineLayout: pipelineLayout,
    });
    //   Aurora.device.queue.writeBuffer(vertexBuffer, 0, this.vertices, 0);

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.2, b: 0.6, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    Aurora.device.queue.writeBuffer(vertBuffer, 0, verts, 0);
    Aurora.device.queue.writeBuffer(addBuffer, 0, addData, 0);
    //   passEncoder.setBindGroup(0,)
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertBuffer);
    passEncoder.setVertexBuffer(1, addBuffer);
    passEncoder.setBindGroup(0, cameraBindGroup);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(6, 1);
    passEncoder.end();
    Aurora.device.queue.submit([commandEncoder.finish()]);
  }
}
