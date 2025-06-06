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
// let x = 100;
function start() {
  Batcher.beginBatch();
  //
  Draw.rect({
    //blue
    position: { x: 280, y: 235 },
    size: { height: 50, width: 50 },
    tint: [0, 0, 255, 255],
  });
  Draw.rect({
    position: { x: 290, y: 230 },
    size: { height: 50, width: 50 },
    tint: [0, 255, 0, 155],
  });
  Draw.rect({
    //pink
    position: { x: 300, y: 225 },
    size: { height: 50, width: 50 },
    tint: [255, 0, 0, 155],
  });
  Draw.rect({
    position: { x: 310, y: 220 },
    size: { height: 50, width: 50 },
    tint: [255, 0, 255, 155],
  });
  Draw.rect({
    position: { x: 320, y: 215 },
    size: { height: 50, width: 50 },
    tint: [0, 255, 255, 155],
  });
  Draw.rect({
    position: { x: 330, y: 510 },
    size: { height: 50, width: 50 },
    tint: [255, 255, 0, 255],
  });
  Draw.text({
    position: { x: 130, y: 310 },
    fontSize: 32,
    fontColor: [255, 255, 255, 255],
    font: "s",
    text: "sranie xD",
  });

  Batcher.endBatch();
  // requestAnimationFrame(start);
}
await preload();
