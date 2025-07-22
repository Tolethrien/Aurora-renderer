# Weekend Optymalizacji 1

- mniej compute passow na bloomie (polacz downscale z xpassem)
- dodac wagi do upscale blendowania
- przebudowac sposob tworzenia pipelinow zamiast klas na jakis system
- przemyslec jak Draw dostaje dane bo moglby wysylac sygnaly do pipelinow lepiej na bazie swoich zmiennych
- parametry renderera trzeba stworzyc, bo np tonemapping musi byc uzywany, a nie dziala jak nie masz pipelinu bloom bo tam go writuje, w nich beda wszystkie bloomu rzeczy plus exposure, saturation, itp, treshold oswietlenia globalnego
