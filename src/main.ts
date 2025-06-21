import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher/batcher";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";
import ctex from "./assets/Jersey25-Regular.png";
import cjson from "./assets/Jersey25-Regular-msdf.json";
import ltex from "./assets/Lato-Regular.png";
import ljson from "./assets/Lato-Regular-msdf.json";
async function preload() {
  await Aurora.init();
  await create();
  start();
}
async function create() {
  await Batcher.Initialize({
    textures: [
      { name: "main", url: spritesheet },
      { name: "char", url: char },
    ],
    fonts: [
      {
        fontName: "ya",
        img: ftex,
        json: fjson,
      },
      {
        fontName: "roboto",
        img: ctex,
        json: cjson,
      },
      {
        fontName: "lato",
        img: ltex,
        json: ljson,
      },
    ],
  });
}
let x = 200;
function start() {
  Batcher.beginBatch();

  Draw.rect({
    position: { x: 350, y: 250 },
    size: { height: 100, width: 100 },
    tint: [255, 0, 0, 255],
  });
  Draw.rect({
    position: { x: 375, y: 275 },
    size: { height: 100, width: 100 },
    tint: [255, 255, 0, 200],
  });
  Draw.rect({
    position: { x: 400, y: 300 },
    size: { height: 100, width: 100 },
    tint: [0, 0, 255, 200],
  });
  Draw.sprite({
    position: { x: 310, y: 500 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 255, 255],
    crop: { x: 0, y: 0, width: 32, height: 32 },
    textureToUse: "char",
  });
  Draw.text({
    position: { x: 260, y: 450 },
    font: "ya",
    fontSize: 14,
    text: "Player One",
    fontColor: [255, 0, 255, 255],
  });
  Draw.circle({
    position: { x: 400, y: 235 },
    size: { height: 50, width: 50 },
    tint: [0, 255, 255, 255],
  });

  Draw.text({
    position: { x: 30, y: 500 },
    font: "lato",
    fontSize: 50,
    text: "Scalable big text!",
    fontColor: [255, 255, 0, 255],
  });
  Draw.text({
    position: { x: 15, y: 480 },
    font: "roboto",
    fontSize: 16,
    text: "Mini-My! small scalable text!",
    fontColor: [255, 255, 255, 255],
  });
  x += 0.5;
  Batcher.endBatch();
  requestAnimationFrame(start);
}
await preload();
