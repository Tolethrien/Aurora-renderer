import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher";
import Draw from "./aurora/urp/draw";
async function preload() {
  await Aurora.init();
  create();
  start();
}
function create() {
  Batcher.Initialize();

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
    position: { x: 300, y: -100 },
    size: { height: 50, width: 50 },
    tint: [1, 0, 1, 1],
  });
  Draw.rect({
    //blue
    position: { x: 310, y: 720 },
    size: { height: 50, width: 50 },
    tint: [0, 0, 1, 1],
  });
  Batcher.endBatch();
  // console.log("s");
  // x += 1;
  requestAnimationFrame(start);
}
await preload();
