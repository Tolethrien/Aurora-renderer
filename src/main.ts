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
  Draw.rect({
    position: { x: 210, y: 310 },
    size: { height: 50, width: 50 },
    tint: [0, 0, 1, 1],
  });
  Batcher.endBatch();
}
await preload();
