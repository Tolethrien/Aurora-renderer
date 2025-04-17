import { assert } from "../utils/utils";

export default class Aurora {
  public static async init() {
    const canvas = document.getElementById("gameWindow") as HTMLCanvasElement;
    const ctx = canvas.getContext("webgpu");
    assert(ctx !== null, "there is no WebGpu context in canvas");
    assert(
      navigator.gpu !== undefined,
      "WebGPU is not supported on this browser."
    );

    const adapter = await navigator.gpu.requestAdapter();
    assert(adapter !== null, "Failed to get GPU adapter.");
    const device = await adapter.requestDevice();

    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({
      device: device,
      format: format,
      alphaMode: "opaque",
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = ctx.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.2, b: 0.3, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }
}
