bloom

- zapisywanie do hdr
- piramidowanie do tekstur i upscaling
- tonemapping na sdr
- bloom powinien miec balans miedzy ogolna jasnoscia sceny a emisyjnoscia obiektow, np slonce w kurwe jasne, zawsze bloomuje, lampka w dzien, nie daje blomu, lampa wieczorem daje

## plan dzialania

1. glowna tekstura musi byc hdr
2. musisz miec system koloru jakis (jako ze floaty to musisz miec minium czarny i max bialy, HSLA?) - to musi byc powiazane z toneMappingiem
   x mipMap tekstury zamiast 16 tekstur
3. 1 pass -> treshold z offscreen koloru na HDR
4. passy w dol maja robic gausianowy blur x,y
5. passy w gore robia upscale i blend!
6. dodane do sceny additive
7. toneMapping na cala scene
8. robic const ovverride na ilosc workgroupy (8) by z jednej zmiennej to kontrolowac
9. dodac opcje zrobienia samego layoutu bindu w aurora core bo teraz uzywam device (this.bloomBindLayout = Aurora.device.createBindGroupLayout)

## wlasciwosci bloom

treshold
treshold softness
low freq boost
high pass freq
