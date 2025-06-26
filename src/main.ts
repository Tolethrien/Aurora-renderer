import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher/batcher";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";

async function preload() {
  await Aurora.init();
  await create();
  start();
}
async function create() {
  await Batcher.Initialize({
    drawOrigin: "center",
    zBuffer: "y",
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
    ],
  });
}
let w = 135;
let h = 114;
function start() {
  Batcher.beginBatch();

  Draw.rect({
    position: { x: 350, y: 250 },
    size: { height: h, width: w },
    tint: [255, 0, 0, 255],
  });
  Draw.rect({
    position: { x: 375, y: 275 },
    size: { height: h, width: w },
    tint: [0, 255, 0, 255 / 2],
  });

  Draw.rect({
    position: { x: 400, y: 300 },
    size: { height: h, width: w },
    tint: [0, 0, 255, 255 / 2],
  });
  Draw.rect({
    position: { x: 425, y: 325 },
    size: { height: h, width: w },
    tint: [255, 255, 255, 255 / 2],
  });
  // Draw.text({
  //   position: { x: 310, y: 470 },
  //   font: "ya",
  //   fontSize: 14,
  //   text: "Player One",
  //   fontColor: [255, 0, 255, 255],
  // });
  // Draw.sprite({
  //   position: { x: 310, y: 480 },
  //   size: { height: 50, width: 50 },
  //   tint: [255, 255, 255, 255],
  //   crop: { x: 0, y: 0, width: 32, height: 32 },
  //   textureToUse: "char",
  // });

  // Draw.text({
  //   position: { x: 300, y: 550 },
  //   font: "lato",
  //   fontSize: 50,
  //   text: "Scalable big text!",
  //   fontColor: [255, 255, 0, 255],
  // });
  // Draw.text({
  //   position: { x: 150, y: 480 },
  //   font: "jersey",
  //   fontSize: 16,
  //   text: "Mini-My! small scalable text!",
  //   fontColor: [255, 255, 255, 255],
  // });
  Batcher.endBatch();
  // requestAnimationFrame(start);
}
await preload();
