Aurora 1.0

Aurora is a 2D rendering engine built on top of the WebGPU and written entirely in TypeScript.
It was originally developed as the rendering backend for the Misa game engine, but it is designed to work equally well as a standalone library for any chromium-based project that requires small and fast 2D graphics.

Core Capabilities

Aurora provides a modern GPU-accelerated 2D rendering pipeline with:

- Multi-shader 2d rendering based on sprites and shapes.

- Depth sorting with Z-buffer.

- High-quality text rendering — with MSDF (Multi-channel Signed Distance Field).

- Fully GPU-driven lighting.

- HDR color,bloom effects with color correction and toneMapping.

- GPU stats.

- UI rendering

![showOff](/public/current.png)

### Note!

    WebGPU is in experimental state, it may not work on every devices and show weird behavior. It is recommended to use it on chromium-based browsers or projects like electron

## V1 Features!

- [x] Multi-shader rendering

- [x] Z-buffer with sorting

- [x] MSDF font rendering

- [x] GPU diagnostics

- [x] Asynchronous pipelines

- [x] GPU driven lighting (no texture-based)

- [x] HDR color support

- [x] HDR bloom with tone mapping

- [x] Adjustable render resolution and resize support

- [x] Post Process

## Roadmap

- [ ] GPU-side rotation

- [ ] More lights shape

- [ ] Multiple camera views (orthographic, perspective)

- [ ] Normal and shadow maps

- [ ] Polygon rendering via Path2D

- [ ] Additional primitive shapes beyond quads

- [ ] Full migration to a render graph architecture with a resource manager

- [ ] Video rendering

- [ ] GIF rendering

## Screenshots from current State

Current State:

![current State](/public/main.png)

debug info:

![debug State](/public/debug.png)

Z-buffer(set to sort by "Y") dumped to texture

![debug State](/public/zBuffer.png)

bloom HDR + toneMapping(rainhard)

![bloom State](/public/bloom-rainhard.png)

bloom HDR + toneMapping(ACES)

![bloom State](/public/bloom-aces.png)

color Correction Options (hueshifted oversaturated sceen with cold tones)

![colCor State](/public/colCor.png)

UI element with MSDF font

![UI State](/public/ui.png)

PostProcessing (chromatic Aberration + vignette)

![Post State](/public/post.png)
