# Batcher

- malowac na start texture canvas ale render na offscreen texture wiec ona nie musi miec koloru
- czy ja chce miec rysowanie od centrum (x,y) czy jednak wole od lewego gornego rogu?
- vertex buffer ma floatx2 dla pos i float2 dla size a moze lepiej po prostu float4 jak crop?
- czy pipeliney powinny byc pipeasync - zgoogluj
- po co robic za kazdym createPipeline i generowac dane z jsona dla textu do sensownej formy, po prostu zapisac juz gotowe i uzywac! ale to przy budowie bardziej zaawansowanego systemu ktory bedzie juz przerbial ttf pliki
- przebudowac pipeliny, by nie tworzyc tone encoderow dla kazdego batcha a raczej miec wielki buffer i offsetowac
- polaczyc jednak shape i sprite pipeline w jedno, szkoda miejsca
- textPipe dla world nie renderuje sie na srodku quada (0,0) to nie centrum a lewy gorny róg
- WBOIT przezroczyste circle nie sa circlem

## TODO

[x] batchowanie na grupy
[x] z-buffer
[x] transparency
[ ] text pipeline
[x] sprite pipeline
[x] shape pipeline
[ ] debug gpu (wyciaganie timestampow itp)
[ ] budowane w shaderach swiatlo
[ ] cieniowanie
[ ] normal mapy
[ ] sposoby renderowania - ortho/izo
[ ] path2d (shape)
[ ] UI pipeline(no camera no Y sort)
[ ] post-processing
[ ] bloom

# Done

- problem z aplha i z-bufferem, rozwiazanie?: Weighted Blended OIT
