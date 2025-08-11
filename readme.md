## Aurora 2.0!

Aurora is webGPU based 2D renderer written in TS.

"This is part of the Misa game engine, but it can also be used as a standalone lib."

based of new knowledge time for some rework!

![Current State](/public/current.png)

## Changes!

[x] multiShader draw

[x] zBuffer with depth(set to Y)

[x] better font rendering with MSDF

[] more shapes then quad

[] Path2D to render polygons

[] draw video

[] draw Gif

[] gpu rotation

[x] proper GPU diagnostics

[x] async pipelines and shaders

[x] lights drawn on gpu and not from texture

[] normal and shadow maps

[] renderResolution and resize

[x] HDR colors

[x] HDR bloom with toneMapping

[] other camera views (isometric, ortho,perspective etc...)

[] custom pipelines/shaders/materials

## Future changes!

total shift to render graph with resource manager

## Screenshots from current State

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
