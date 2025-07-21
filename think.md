## plan dzialania

- jakis system jednolity kolorow dla wszystkiego

- poprawic swiatla bo teraz mocno odcinaja jak masz HDR

- nie dziala w debugData color Corr

- bloom powinien miec balans miedzy ogolna jasnoscia sceny a emisyjnoscia obiektow, np slonce w kurwe jasne, zawsze bloomuje, lampka w dzien, nie daje blomu, lampa wieczorem daje

x glowna tekstura musi byc hdr 2. musisz miec system koloru jakis (jako ze floaty to musisz miec minium czarny i max bialy, HSLA?) - to musi byc powiazane z toneMappingiem

x mipMap tekstury zamiast 16 tekstur

x 1 pass -> treshold z offscreen koloru na HDR

x passy w dol maja robic gausianowy blur x,y

x passy w gore robia upscale i blend!

x dodane do sceny additive

x toneMapping na cala scene

8. robic const ovverride na ilosc workgroupy (8) by z jednej zmiennej to kontrolowac

9. dodac opcje zrobienia samego layoutu bindu w aurora core bo teraz uzywam device (this.bloomBindLayout = Aurora.device.createBindGroupLayout)

## wlasciwosci bloom

treshold
treshold softness
low freq boost
high pass freq

## co zrobic

[-] dodac jakis uniform z wlasciwosciami
[-] przebudowac by nie tworzyc bindow co chwile nowych a juz przygotowac jes
[-]
[-] ovverride workgrup
[-] debugInfo color corr

- wykminic system kolorow
- zbudowac lepszy system pipelinow
  [-] leiej smooth swiatla
  [-] czy swiatla powinny tez byc hdr?
- threshold oswietlenia globalnego
- zmniejszyc ilosc pipelinow
  [-] zmienic te rzeczy co uzywaja .device
- poprawic faktyczny shader a nie debug by mial tonemap itp
