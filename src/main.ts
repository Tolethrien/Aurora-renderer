import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher/batcher";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";
import AuroraDebugInfo from "./aurora/urp/debugger/debugInfo";

async function preload() {
  await Aurora.init();
  await create();
  start(0);
}

async function create() {
  const yaFont = { fontName: "ya", img: ftex, json: fjson };
  await Batcher.Initialize({
    drawOrigin: "center",
    sortOrder: "y",
    debugger: true,
    textures: [
      { name: "main", url: spritesheet },
      { name: "char", url: char },
    ],
    fonts: [yaFont],
  });
  Batcher.setColorCorrection([100, 100, 100]);
}
const arr = Array(100)
  .fill(0)
  .map(() => [Math.random() * 600, Math.random() * 600]);

let w = 135;
let h = 114;
function start(timestamp: number) {
  AuroraDebugInfo.startCount(timestamp);
  Batcher.beginBatch();
  Draw.rect({
    position: { x: 375, y: 275 },
    size: { height: h, width: w },
    tint: [0, 255, 0, 255 / 2],
  });
  // Draw.rect({
  //   position: { x: 425, y: 325 },
  //   size: { height: h, width: w },
  //   tint: [255, 0, 255, 255 / 2],
  // });
  arr.forEach((el) => {
    Draw.sprite({
      position: { x: el[0], y: el[1] },
      size: { height: 50, width: 50 },
      tint: [255, 255, 255, 255],
      crop: { x: 0, y: 0, width: 32, height: 32 },
      textureToUse: "char",
    });
  });
  const lightColor = 255;
  Draw.rect({
    position: { x: 350, y: 250 },
    size: { height: h, width: w },
    tint: [255, 0, 0, 255],
    emissive: true,
  });
  Draw.circle({
    position: { x: 425, y: 225 },
    size: { height: 50, width: 50 },
    tint: [255, 0, 0, 255],
  });
  Draw.pointLight({
    position: { x: 500, y: 100 },
    size: { height: 350, width: 350 },
    tint: [lightColor, 100, 100, 255],
    intensity: 255,
  });
  Draw.pointLight({
    position: { x: 300, y: 300 },
    size: { height: 350, width: 350 },
    tint: [100, lightColor, 100, 255],
    intensity: 255,
  });
  Draw.pointLight({
    position: { x: 100, y: 500 },
    size: { height: 350, width: 350 },
    tint: [100, 100, lightColor, 255],
    intensity: 255,
  });
  Draw.rect({
    position: { x: 400, y: 300 },
    size: { height: h, width: w },
    tint: [0, 0, 255, 255 / 2],
  });
  Draw.text({
    position: { x: 200, y: 330 },
    font: "ya",
    fontSize: 14,
    text: "Player One",
    fontColor: [255, 0, 255, 150],
  });

  Draw.text({
    position: { x: 300, y: 550 },
    font: "lato",
    fontSize: 62,
    text: "Scalable big text!",
    fontColor: [255, 255, 0, 255],
  });
  Draw.text({
    position: { x: 150, y: 480 },
    font: "ya",
    fontSize: 8,
    text: "this will be a little bit of a problem couse i sure will use even a 8 size",
    fontColor: [255, 255, 255, 255],
  });

  Batcher.endBatch();
  AuroraDebugInfo.endCount();
  AuroraDebugInfo.displayEveryFrame(60, true);
  requestAnimationFrame(start);
}
await preload();
