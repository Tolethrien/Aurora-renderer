import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import { MsdfTextRenderer } from "./helps/mdfs/msdfTextRenderPass";
import generateFont from "./aurora/urp/msdf/generateFont";
import ftex from "./helps/mdfs/assets/ya-hei-ascii.png";
import fjson from "./helps/mdfs/assets/ya-hei-ascii-msdf.json";
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

  // const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  // const depthFormat = "depth24plus";
  // const textRenderer = new MsdfTextRenderer(
  //   Aurora.device,
  //   presentationFormat,
  //   depthFormat
  // );
  // const textRendererF = await textRenderer.createFont(
  //   new URL(
  //     "./helps/mdfs/assets/ya-hei-ascii-msdf.json",
  //     import.meta.url
  //   ).toString()
  // );
  // console.log(textRendererF);
  //============================================
}
let x = 200;
function start() {
  Batcher.beginBatch();
  //
  // Draw.rect({
  //   //blue
  //   position: { x: 340, y: 335 },
  //   size: { height: 250, width: 250 },
  //   tint: [0, 0, 0, 255],
  // });
  Draw.rect({
    //blue
    position: { x: 350, y: 250 },
    size: { height: 100, width: 100 },
    tint: [255, 0, 0, 255],
  });
  Draw.rect({
    //blue
    position: { x: 375, y: 275 },
    size: { height: 100, width: 100 },
    tint: [255, 255, 0, 200],
  });
  Draw.rect({
    //blue
    position: { x: 400, y: 300 },
    size: { height: 100, width: 100 },
    tint: [0, 0, 255, 200],
  });
  Draw.sprite({
    position: { x: 400, y: 300 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 255, 250],
    crop: { x: 0, y: 0, width: 32, height: 32 },
    textureToUse: "char",
  });
  Draw.circle({
    position: { x: 480, y: 235 },
    size: { height: 50, width: 50 },
    tint: [0, 255, 255, 250],
  });
  x += 0.5;
  Batcher.endBatch();
  // requestAnimationFrame(start);
}
await preload();
