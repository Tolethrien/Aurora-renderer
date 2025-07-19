## Nowy Projekt Aurory!

nauczony wiedzą z pierwszej próby przystępuję do ulepszenia renderera!

canvas view:

![Current State](/public/current.png)

debug info:

![debug State](/public/debug.png)

Z-buffer(set to sort by "Y") dumped to texture

![debug State](/public/zBuffer.png)

bloom HDR + toneMapping

![bloom State](/public/bloom.png)

## zmiany wzgledem starej wersji!

- zamiast jednego shadera multishadering
- zamiast sortowac obiekty na CPU używany Z-buffer (ustawionym na Y)
- ulepszone renderowanie tekstu używając MSDF zamiast po prostu próbkowania tekstury
- Draw ma inne kształty niż tylko rect
- Path2d do renderowania poligonów
- możliwość renderowania wideo
- poprawny debugger faktycznie na GPU
- asynchroniczne kompilowanie pipelinów i shaderów
- generowane na GPU pełne oświetlenie a nie ze spritów
- normal mapy i shadow mapy
- pixel density
- poprawny bloom za pomoca HDR i piramidowania + toneMapping
- izometria
- możliwość dodawania własnych pipelinów
- rotacja na GPU

## Pełne TODO

lista postępów znajduję się w todo.md
