interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}
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
// export function hsla(h, s, l, a) {
//   return [h, s, l, a];
// }
export function hslaToRgba(h: number, s: number, l: number, a: number): RGBA {
  h = h % 360;
  if (h < 0) h += 360;
  s = Math.max(0, Math.min(1, s));
  a = Math.max(0, Math.min(1, a));

  let r: number, g: number, b: number;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (l <= 1) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);

    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);
  } else {
    // Obsługa wartości L > 1 dla emiterów (HDR)
    // Zachowujemy odcień i nasycenie, a jasność skalujemy proporcjonalnie.
    // L = 1 oznacza pełną jasność LDR. Wartości > 1 zwiększają intensywność.
    // Możemy założyć, że bazowy kolor LDR dla L=1 jest maksymalnie nasycony.

    // Najpierw obliczamy bazowy kolor przy pełnej jasności LDR (L=1)
    const baseL = 0.5; // Przyjmujemy 0.5 jako bazową jasność LDR dla pełnego nasycenia
    const qBase = baseL * (1 + s);
    const pBase = 2 * baseL - qBase;

    let baseR = hue2rgb(pBase, qBase, h / 360 + 1 / 3);
    let baseG = hue2rgb(pBase, qBase, h / 360);
    let baseB = hue2rgb(pBase, qBase, h / 360 - 1 / 3);

    // Skalujemy wartości RGB proporcjonalnie do "przejścia" ponad L=1
    // Przyjmujemy, że l = 1.0 reprezentuje 255.
    // L = 2.0 reprezentuje 2 * 255 itd.
    const multiplier = l;

    r = Math.round(baseR * 255 * multiplier);
    g = Math.round(baseG * 255 * multiplier);
    b = Math.round(baseB * 255 * multiplier);
  }

  return { r: r, g: g, b: b, a: a };
}
