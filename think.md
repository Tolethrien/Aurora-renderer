## plan dzialania

x jakis system jednolity kolorow dla wszystkiego

x poprawic swiatla bo teraz mocno odcinaja jak masz HDR

x nie dziala w debugData color Corr

x bloom powinien miec balans miedzy ogolna jasnoscia sceny a emisyjnoscia obiektow, np slonce w kurwe jasne, zawsze bloomuje, lampka w dzien, nie daje blomu, lampa wieczorem daje

x glowna tekstura musi byc hdr 2. musisz miec system koloru jakis (jako ze floaty to musisz miec minium czarny i max bialy, HSLA?) - to musi byc powiazane z toneMappingiem

x mipMap tekstury zamiast 16 tekstur

x 1 pass -> treshold z offscreen koloru na HDR

x passy w dol maja robic gausianowy blur x,y

x passy w gore robia upscale i blend!

x dodane do sceny additive

x toneMapping na cala scene

x robic const ovverride na ilosc workgroupy (8) by z jednej zmiennej to kontrolowac

x dodac opcje zrobienia samego layoutu bindu w aurora core bo teraz uzywam device (this.bloomBindLayout = Aurora.device.createBindGroupLayout)

## wlasciwosci bloom

treshold
treshold softness
low freq boost
high pass freq

## co zrobic

- zbudowac lepszy system pipelinow
- zmniejszyc ilosc pipelinow

- poprawic faktyczny shader a nie debug by mial tonemap itp
