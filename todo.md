# Batcher

- malowac na start texture canvas ale render na offscreen texture wiec ona nie musi miec koloru
- czy ja chce miec rysowanie od centrum (x,y) czy jednak wole od lewego gornego rogu?
- problem z aplha i z-bufferem, rozwiazanie?: Weighted Blended OIT
- vertex buffer ma floatx2 dla pos i float2 dla size a moze lepiej po prostu float4 jak crop?
- czy pipeliney powinny byc pipeasync - zgoogluj
- po co robic za kazdym createPipeline i generowac dane z jsona dla textu do sensownej formy, po prostu zapisac juz gotowe i uzywac! ale to przy budowie bardziej zaawansowanego systemu ktory bedzie juz przerbial ttf pliki

## Tests

[x] batchowanie na grupy
[x] z-buffer
[ ] transparency
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
[ ] 2 watki dla logiki i updatu osobno
