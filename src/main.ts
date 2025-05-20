import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
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
  });

  //============================================
}
// let x = 100;
function start() {
  Batcher.beginBatch();
  Draw.rect({
    //blue
    position: { x: 280, y: 235 },
    size: { height: 50, width: 50 },
    tint: [0, 0, 255, 155],
  });
  Draw.rect({
    position: { x: 320, y: 210 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 255, 55],
  });
  Draw.rect({
    //pink
    position: { x: 300, y: 171 },
    size: { height: 150, width: 50 },
    tint: [255, 0, 255, 55],
  });

  Batcher.endBatch();
}
await preload();
