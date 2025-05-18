import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher";
import Draw from "./aurora/urp/draw";
import spritesheet from "./assets/radial.png";
async function preload() {
  await Aurora.init();
  await create();
  start();
}
async function create() {
  await Batcher.Initialize({ textures: [{ name: "main", url: spritesheet }] });

  //============================================
}
// let x = 100;
function start() {
  Batcher.beginBatch();
  Draw.circle({
    position: { x: 100, y: 300 },
    size: { height: 50, width: 50 },
    tint: [1, 1, 1, 1],
  });
  Draw.rect({
    //pink
    position: { x: 300, y: 671 },
    size: { height: 150, width: 50 },
    tint: [1, 0, 1, 1],
  });
  Draw.rect({
    //blue
    position: { x: 310, y: 720 },
    size: { height: 50, width: 50 },
    tint: [0, 0, 1, 1],
  });
  Draw.sprite({
    //blue
    position: { x: 320, y: 720 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 100, 255],
    crop: { x: 0, y: 0, width: 200, height: 200 },
    textureToUse: "main",
  });
  Batcher.endBatch();
  // console.log("s");
  // x += 1;
  requestAnimationFrame(start);
}
await preload();
