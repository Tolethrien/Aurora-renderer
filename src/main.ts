import Aurora from "./aurora/core";
import "./style.css";
import temp from "./aurora/shaders/temp.wgsl?raw";
async function preload() {
  await Aurora.init();
  create();
  start();
}
function create() {
  //============================================
  const commandEncoder = Aurora.device.createCommandEncoder();
  const textureView = Aurora.context.getCurrentTexture().createView();
  const verts = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.0, 0.5, 0.2, 0.7]); // 3 instancje

  const shader = Aurora.createShader("temp", temp);
  const indexBuffer = Aurora.createMappedBuffer({
    data: [0, 1, 2, 1, 2, 3],
    bufferType: "index",
    dataType: "Uint32Array",
    label: "indexBuffer",
  });
  const vertBuffer = Aurora.createBuffer({
    bufferType: "vertex",
    label: "indexBuffer",
    dataLength: verts.length,
    dataType: "Float32Array",
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.1, g: 0.2, b: 0.6, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };
  const pipelineLayout = Aurora.createPipelineLayout([]);
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
  const pipeline = Aurora.createRenderPipeline({
    shader: shader,
    pipelineName: "main",
    buffers: [vertBuffLay],
    pipelineLayout: pipelineLayout,
  });
  //   Aurora.device.queue.writeBuffer(vertexBuffer, 0, this.vertices, 0);
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  Aurora.device.queue.writeBuffer(vertBuffer, 0, verts, 0);
  //   passEncoder.setBindGroup(0,)
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, vertBuffer);
  passEncoder.setIndexBuffer(indexBuffer, "uint32");
  passEncoder.drawIndexed(6, verts.length / 2);
  passEncoder.end();
  Aurora.device.queue.submit([commandEncoder.finish()]);
}
function start() {}
await preload();
