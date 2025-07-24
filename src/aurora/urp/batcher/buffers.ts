import Aurora from "../../core";

export function createIndexBuffer() {
  return Aurora.createMappedBuffer({
    data: [0, 1, 2, 1, 2, 3],
    bufferType: "index",
    dataType: "Uint32Array",
    label: "indexBuffer",
  });
}
export function clearTextureBuffer() {
  const bytesPerRow = Math.ceil((8 * Aurora.canvas.width) / 256) * 256;
  const bufferSize = bytesPerRow * Aurora.canvas.height;
  const zeroBuf = Aurora.device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  new Uint8Array(zeroBuf.getMappedRange()).fill(0);
  zeroBuf.unmap();
  return zeroBuf;
}
