import Aurora from "./aurora/core";
import "./style.css";
import AuroraCamera from "./aurora/urp/camera";
import ShapePipe from "./aurora/urp/pipelines/shapePipe";
import Batcher from "./aurora/urp/batcher";
import Draw from "./aurora/urp/draw";
let x = 0;
async function preload() {
  await Aurora.init();
  create();
  start();
}
function create() {
  Batcher.Initialize();

  //============================================
}
function start() {
  Batcher.beginBatch();
  Draw.circle({
    position: { x: 100, y: 300 },
    size: { height: 50, width: 50 },
    tint: [1, 1, 1, 1],
  });
  Draw.rect({
    position: { x: 200, y: 300 },
    size: { height: 50, width: 50 },
    tint: [1, 0, 1, 1],
  });
  Batcher.endBatch();
  // x++;
  requestAnimationFrame(start);
}
await preload();
