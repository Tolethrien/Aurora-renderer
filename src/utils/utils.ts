export function assert(value: boolean, error?: string): asserts value {
  if (!value) throw new Error(error ?? "Assert Error");
}
export function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const image = new Image();
    image.src = src;
    image.onload = () => res(image);
    image.onerror = () => rej(`image with src: ${src} couldn't be loaded`);
  });
}
