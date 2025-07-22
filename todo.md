# Think

- lekkie pulsowanie podczas zoomu camery(zapewe subpixelowe)
- zamiast miec buffer z opcjami batchera mozesz miec fragment constants
- w debugerInfo zacznij uzywac aurory buffer
- debugerze nie lepiej swapowac textureBind caly zamiast miec liste tekstur?
- jak bedzie wiecej opcji w debugInfo to zmien sposob czyszczenia ich
- zrobic zamiast bufferu z opcjami overridy
- jakis system ustawiania kolejnosci pipelinow bo teraz sie ustawia wedle kolejnosci Draw
- zmienic zbuffer granice z faktycznych obiektow Y na view camery(po co rysowac cos co jes za kamera)
- posprzatac drawPipeliny bo za duzo tam pracy przy jakichkolwiek zmianach
- zrobic zwyczajnie need Clean w pipelinie i na 1 batchu czyscic teksture a potem loadowac(1 render pass mniej)
- czyszczenie tekstur powinno byc w pipelinach a nie jak teraz jako wielki pass pierwszy batcheru
- moze by zrobic tylko sprite/circle i oba one moga byc texturowane po prostu
- jak nie masz zadnego point lightu to nie masz swiatla w ogole
- zrobic debuuger na process.env by dzialal tree-shaking
- mniej compute passow na bloomie (polacz downscale z xpassem)
- dodac wagi do upscale blendowania
- przebudowac sposob tworzenia pipelinow zamiast klas na jakis system
- przemyslec jak Draw dostaje dane bo moglby wysylac sygnaly do pipelinow lepiej na bazie swoich zmiennych
- parametry renderera trzeba stworzyc, bo np tonemapping musi byc uzywany, a nie dziala jak nie masz pipelinu bloom bo tam go writuje, w nich beda wszystkie bloomu rzeczy plus exposure, saturation, itp, treshold oswietlenia globalnego

# Done

- zmieniles na 1 encoder wiec upewnij sie ze obiekty nie przekrocza bufferSize(flush przekraczajac)
- czy text moze potencjalnie przekroczyc wielkosc vertexa bo przeciez dajesz kilkanascie znakow a nie jeden jak w shape
- jednak musi miec osobny caly pipeline dla unsorted
- przezroczysty text ma lekki problem ze smoothstepem kiedy jest nakladany na stały obiekt, generalnie to problem WBOIT ze smoothstep nie do konca dobrze z nim dziala - prawie nie widoczne, ale jednak jest
- chyba dalej nie dziala WBOIT dobrze... zle blendowanie kolorow?
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

## Fiuczers

[x] batchowanie na grupy
[x] z-buffer
[x] transparency
[x] text pipeline
[x] sprite pipeline
[x] shape pipeline
[ ] Draw musi miec opcje rotacja
[x] batcher option - renderowanie (centrum,leftTop)
[x] batcher option - kolejnosc renderowania (kolejnosc wywolywania, zbuffer na Y)
[x] batcher option - add fonts
[x] debug gpu (wyciaganie timestampow itp)
[z] debug mode - zmiana wyswietlanej tekstury na ekranie (renderuj depth itp)
[ ] UI pipeline(no camera no Y sort inne text renderowanie)
[ ] pixelDencity/deviceRatio
[ ] post-processing
[x] budowane w shaderach swiatlo
[x] bloom
[ ] Draw.video
[ ] Draw.gif
[ ] cieniowanie?
[ ] normal mapy?
[ ] sposoby renderowania - ortho/izo
[ ] path2d (shape)
[ ] lepsze budowanie shaderow z fragmentow kodu (by nie powtarzac tego samego kodu w 4 plikach shaderow tylko jakos je budowac/laczyc)
[ ]
