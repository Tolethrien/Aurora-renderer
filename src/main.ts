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
  Draw.circle({
    position: { x: 100, y: 300 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 255, 255],
  });
  Draw.sprite({
    //blue
    position: { x: 320, y: 720 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 255, 255],
    crop: { x: 0, y: 0, width: 32, height: 32 },
    textureToUse: "char",
  });
  Draw.sprite({
    //blue
    position: { x: 450, y: 720 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 255, 255],
    crop: { x: 0, y: 0, width: 200, height: 200 },
    textureToUse: "main",
  });
  Draw.rect({
    //pink
    position: { x: 300, y: 671 },
    size: { height: 150, width: 50 },
    tint: [255, 0, 255, 255],
  });
  Draw.rect({
    //blue
    position: { x: 310, y: 720 },
    size: { height: 50, width: 50 },
    tint: [0, 0, 255, 255],
  });
  Batcher.endBatch();
  // console.log("s");
  // x += 1;
  requestAnimationFrame(start);
}
await preload();
