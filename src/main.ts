import Aurora from "./aurora/core";
import "./style.css";
import Batcher from "./aurora/urp/batcher/batcher";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";
import AuroraDebugInfo from "./aurora/urp/debugger/debugInfo";

async function preload() {
  await Aurora.init();
  await create();
  start(0);
}
interface t {
  lightcolor: [number, number, number];
  intence: number;
  pos: [number, number];
  size: [number, number];
  emis: number;
}
function makeLight({ intence, lightcolor, pos, size, emis }: t) {
  Draw.rect({
    position: { x: pos[0], y: pos[1] },
    size: { height: size[0], width: size[1] },
    tint: [lightcolor[0], lightcolor[1], lightcolor[2], 255],
    emissive: emis,
  });
  Draw.pointLight({
    position: { x: pos[0], y: pos[1] },
    size: { height: size[0] + 300, width: size[1] + 300 },
    tint: [lightcolor[0], lightcolor[1], lightcolor[2], 255],
    intensity: intence,
  });
}
async function create() {
  const yaFont = { fontName: "ya", img: ftex, json: fjson };
  await Batcher.Initialize({
    drawOrigin: "center",
    sortOrder: "y",
    debugger: true,
    textures: [
      { name: "main", url: spritesheet },
      { name: "char", url: char },
    ],
    fonts: [yaFont],
  });
  const l = 50;
  Batcher.setColorCorrection([l, l, l]);
}
const arr = Array(100)
  .fill(0)
  .map(() => [Math.random() * 600, Math.random() * 600]);

let w = 135;
let h = 114;
let x = 200;
function start(timestamp: number) {
  AuroraDebugInfo.startCount(timestamp);
  Batcher.beginBatch();
  // Draw.rect({
  //   position: { x: 375, y: 275 },
  //   size: { height: h, width: w },
  //   tint: [255, 255, 0, 255],
  // });
  // Draw.rect({
  //   position: { x: 425, y: 325 },
  //   size: { height: h, width: w },
  //   tint: [255, 0, 255, 255 / 2],
  // });
  arr.forEach((el) => {
    Draw.sprite({
      position: { x: el[0], y: el[1] },
      size: { height: 50, width: 50 },
      tint: [255, 255, 255, 255],
      crop: { x: 0, y: 0, width: 32, height: 32 },
      textureToUse: "char",
    });
  });
  makeLight({
    intence: 255,
    lightcolor: [255, 70, 70],
    pos: [300, 300],
    size: [100, 100],
    emis: 5,
  });
  makeLight({
    intence: 255,
    lightcolor: [255, 50, 255],
    pos: [50, 50],
    size: [50, 50],
    emis: 5,
  });
  makeLight({
    intence: 255,
    lightcolor: [255, 255, 255],
    pos: [500, 550],
    size: [50, 50],
    emis: 4,
  });
  makeLight({
    intence: 255,
    lightcolor: [255, 255, 50],
    pos: [50, 550],
    size: [50, 50],
    emis: 5,
  });
  makeLight({
    intence: 255,
    lightcolor: [70, 70, 255],
    pos: [550, 50],
    size: [50, 50],
    emis: 6,
  });
  // const lightColor = 255;
  // Draw.rect({
  //   position: { x: x - 50, y: 250 },
  //   size: { height: 100, width: 100 },
  //   tint: [lightColor, 100, 0, 255],
  // });
  // Draw.rect({
  //   position: { x: x, y: 250 + 150 },
  //   size: { height: 100, width: 100 },
  //   tint: [lightColor, 100, 0, 255],
  // });
  // Draw.rect({
  //   position: { x: x + 50, y: 250 - 150 },
  //   size: { height: 100, width: 100 },
  //   tint: [lightColor, 100, 0, 255],
  // });
  // Draw.circle({
  //   position: { x: 425, y: 225 },
  //   size: { height: 50, width: 50 },
  //   tint: [255, 70, 70, 255],
  //   emissive: 5,
  // });
  // Draw.pointLight({
  //   position: { x: x, y: 250 },
  //   size: { height: 550, width: 550 },
  //   tint: [255, 100, 0, 255],
  //   intensity: 255,
  // });
  // Draw.pointLight({
  //   position: { x: 300, y: 300 },
  //   size: { height: 350, width: 350 },
  //   tint: [100, lightColor, 100, 255],
  //   intensity: 255,
  // });
  // Draw.pointLight({
  //   position: { x: 100, y: 500 },
  //   size: { height: 350, width: 350 },
  //   tint: [100, 100, lightColor, 255],
  //   intensity: 255,
  // });
  // Draw.rect({
  //   position: { x: 480, y: 270 },
  //   size: { height: h, width: w },
  //   tint: [0, 0, 255, 255 / 2],
  // });
  // Draw.text({
  //   position: { x: 200, y: 330 },
  //   font: "ya",
  //   fontSize: 14,
  //   text: "Player One",
  //   fontColor: [255, 0, 255, 150],
  // });

  // Draw.text({
  //   position: { x: 300, y: 550 },
  //   font: "lato",
  //   fontSize: 62,
  //   text: "Scalable big text!",
  //   fontColor: [255, 255, 0, 255],
  // });
  // Draw.text({
  //   position: { x: 150, y: 480 },
  //   font: "ya",
  //   fontSize: 8,
  //   text: "this will be a little bit of a problem couse i sure will use even a 8 size",
  //   fontColor: [255, 255, 255, 255],
  // });

  Batcher.endBatch();
  AuroraDebugInfo.endCount();
  AuroraDebugInfo.displayEveryFrame(60, true);
  // x++;
  requestAnimationFrame(start);
}
await preload();
