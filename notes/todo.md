# Think

- przeleciec wszystko w config i sprawic by tam dzialalo, by wszystkie te rzeczy tam byly zaimpementowane itp
- lekkie pulsowanie podczas zoomu camery(zapewe subpixelowe)
- zrobic debuuger na process.env by dzialal tree-shaking
- roundness nie dziala jak powinno, powinno miec 4 wartosci dla bokow i miec bardziej zaawansowany algo jak CSS
- bloom powiniene miec passy dostosowywane do wielkosci tekstury bo teraz 6-7 passow robi artefakty
- sprawdz bo ja chyba nie czekam na awaity jak generuje pipeliny dynamicznie(loopem)
- fajnie by bylo dodac liczenie pamieci lacznie na gpu
- skonsolidowac wszystkie opcje w jeden set w rendererze(colorCorrecion,PPLDR,bloom,PPHDR)
- getScreenSetting(tint) nie dziala, daje jeden numer
- vinieta pozwala na przenikanie przezroczystych elementow jak cienie postaci
- po co miec init aurory i potem renderera jak to jedno i to samo
- oddzielic wielkosc canvasu od render resolution
- usun globalneBindy z rendera albo faktycznie je dodaj xD
- cos szwankuje przy malych literach bo robi sie caly quad szary pod litera

# Done

- jak bedzie wiecej opcji w debugInfo to zmien sposob czyszczenia ich
- liczenie kazdego pipelinu czasu
- zmienic debugInfo by zawieral teraz passy oraz calle
- jeden render/compute pass dla pipelinu jak nie zmienias targetow
- depth moze miec discard load bo nie uzywasz go juz potem o ile masz 1 renderpass
- poprawic faktyczny shader a nie debug by mial tonemap itp
- poprawic sequentialDraw bo widze ze uzywa transparent w getBatch a przeciez nie ma transparent tam xD
- nie dziala sortowanie przezroczystych w sortedDraw
- zmienic zbuffer granice z faktycznych obiektow Y na view camery(po co rysowac cos co jest za kamera)
- po zmniejszeniu obrazu bloo nie wyglada tak ladnie jak na poczatku
- mniej compute passow na bloomie (polacz downscale z xpassem)
- parametry renderera trzeba stworzyc, bo np tonemapping musi byc uzywany, a nie dziala jak nie masz pipelinu bloom bo tam go writuje, w nich beda wszystkie bloomu rzeczy plus exposure, saturation, itp, treshold oswietlenia globalnego
- debugerze nie lepiej swapowac textureBind caly zamiast miec liste tekstur?
- przemyslec jak Draw dostaje dane bo moglby wysylac sygnaly do pipelinow lepiej na bazie swoich zmiennych
- po co mi w generatorach kompilacja shaderow jak np bloom sam sobie to i tak robi, po co kompilowac shadery ktore nie sa uzywane w kilku miejscach(przeniesc debug do pipu?)
- przebudowac createBindGroup na mniej zajmujace miejsce
- w batcherze odddzielic w sumie uniform z toneMapem d uniformu bloomu bo one nie sa ze soba w ogole powiazane(bloom osobno, tonemap dodac do generalnego uniformu)
- brak lightu w configu mnozy scene przez pusta texture(0)
- brak bloomu w configu nie ustawia tonemapu na aces
- w debugerInfo zacznij uzywac aurory buffer
- jak nie masz zadnego point lightu to nie masz swiatla w ogole
- przeniesc accu couunt quadow circlow itp do pipelinu z draw (suma counterow to ilosc quadow)
- moze by zrobic tylko sprite/circle i oba one moga byc texturowane po prostu
- zrobic zwyczajnie need Clean w pipelinie i na 1 batchu czyscic teksture a potem loadowac(1 render pass mniej)
- czyszczenie tekstur powinno byc w pipelinach a nie jak teraz jako wielki pass pierwszy batcheru
- posprzatac drawPipeliny bo za duzo tam pracy przy jakichkolwiek zmianach
- jakis system ustawiania kolejnosci pipelinow bo teraz sie ustawia wedle kolejnosci Draw
- zrobic zamiast bufferu z opcjami overridy
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
- mierzenie kazdego pipu ile zajmuje a nie tylko ogolne gpu

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
[x] debug mode - zmiana wyswietlanej tekstury na ekranie (renderuj depth itp)
[x] UI pipeline(no camera no Y sort inne text renderowanie)
[x] pixelDencity/deviceRatio
[ ] post-processing
[x] budowane w shaderach swiatlo
[x] bloom
[ ] Draw.video
[ ] Draw.gif
[ ] Draw.line
[ ] cieniowanie?
[ ] normal mapy?
[ ] path2d (shape)
[ ] lepsze budowanie shaderow z fragmentow kodu (by nie powtarzac tego samego kodu w 4 plikach shaderow tylko jakos je budowac/laczyc)
