import Aurora from "./aurora/core";
import "./style.css";
import temp from "./aurora/urp/shaders/shape.wgsl?raw";
import AuroraCamera from "./aurora/urp/camera";
async function preload() {
  await Aurora.init();
  AuroraCamera.initialize();
  create();
  start();
}
function create() {
  AuroraCamera.update();
  //============================================
  const commandEncoder = Aurora.device.createCommandEncoder();
  const textureView = Aurora.context.getCurrentTexture().createView();
  const verts = new Float32Array([100, 100, 50, 50, 1]); // 3 instancje

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
    arrayStride:
      4 * Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT,
    stepMode: "instance",
    attributes: [
      {
        format: "float32x2",
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
      },
      {
        format: "float32x2",
        offset: 2 * Float32Array.BYTES_PER_ELEMENT,
        shaderLocation: 1, // Position, see vertex shader
      },
      {
        format: "uint32",
        offset: 4 * Float32Array.BYTES_PER_ELEMENT,
        shaderLocation: 2, // Position, see vertex shader
      },
    ],
  });
  const pipeline = Aurora.createRenderPipeline({
    shader: shader,
    pipelineName: "main",
    buffers: [vertBuffLay],
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
  //   passEncoder.setBindGroup(0,)
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, vertBuffer);
  passEncoder.setBindGroup(0, cameraBindGroup);
  passEncoder.setIndexBuffer(indexBuffer, "uint32");
  passEncoder.drawIndexed(6, 1);
  passEncoder.end();
  Aurora.device.queue.submit([commandEncoder.finish()]);
}
function start() {}
await preload();
