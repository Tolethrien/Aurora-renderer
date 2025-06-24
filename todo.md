# Think

- przezroczysty text ma lekki problem ze smoothstepem kiedy jest nakladany na stały obiekt, generalnie to problem WBOIT ze smoothstep nie do konca dobrze z nim dziala - prawie nie widoczne, ale jednak jest

## TODO

[x] batchowanie na grupy
[x] z-buffer
[x] transparency
[x] text pipeline
[x] sprite pipeline
[x] shape pipeline
[ ] Draw musi miec opcje rotacja
[ ] batcher option - renderowanie (centrum,leftTop)
[ ] batcher option - dodawania i usuwanie dynamiczne textur
[ ] batcher option - kolejnosc renderowania (kolejnosc wywolywania, zbuffer na Y)
[x] batcher option - add fonts
[ ] debug gpu (wyciaganie timestampow itp)
[ ] debug mode - zmiana wyswietlanej tekstury na ekranie (renderuj depth itp)
[ ] UI pipeline(no camera no Y sort inne text renderowanie)
[ ] pixelDencity/deviceRatio
[ ] post-processing
[ ] budowane w shaderach swiatlo
[ ] bloom
[ ] Draw.video
[ ] Draw.gif
[ ] cieniowanie
[ ] normal mapy
[ ] sposoby renderowania - ortho/izo
[ ] path2d (shape)
[ ] lepsze budowanie shaderow z fragmentow kodu (by nie powtarzac tego samego kodu w 4 plikach shaderow tylko jakos je budowac/laczyc)
[ ]

# Done

- textPipe dla world nie renderuje sie na srodku quada (0,0) to nie centrum a lewy gorny róg
- vertex buffer ma floatx2 dla pos i float2 dla size a moze lepiej po prostu float4 jak crop? - NIE xD
- rozdzielic Batcher na kilka mniejszych bo szybko zrobi sie 5k linii
- dodaj wbudowany chociaz jeden font (najlepiej 2)
- posprzatac color Targety
- przerob w batcherze by pipeliny kompilowaly sie rownolegle a nie sekwencyjnie
- przerobic font z jednego fontu na array fontow
- WBOIT przezroczyste circle nie sa circlem
- polaczyc jednak shape i sprite pipeline w jedno, szkoda miejsca
- malowac na start texture canvas ale render na offscreen texture wiec ona nie musi miec koloru
- problem z aplha i z-bufferem, rozwiazanie?: Weighted Blended OIT

# Fjuczer Ficzer

- po co robic za kazdym createPipeline i generowac dane z jsona dla textu do sensownej formy, po prostu zapisac juz gotowe i uzywac! ale to przy budowie bardziej zaawansowanego systemu ktory bedzie juz przerbial ttf pliki
