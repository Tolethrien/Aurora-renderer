import Aurora from "./aurora/core";
import "./style.css";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";
import AuroraDebugInfo from "./aurora/urp/debugger/debugInfo";
import auroraConfig from "./aurora/urp/batcher/config";
import Renderer from "./aurora/urp/batcher/renderer";
import AuroraCamera from "./aurora/urp/camera";
interface t {
  lightcolor: [number, number, number];
  intence: number;
  pos: [number, number];
  size: [number, number];
  emis: number;
}
const arr = Array(100)
  .fill(0)
  .map(() => [Math.random() * 600, Math.random() * 600]);

const yaFont = { fontName: "ya", img: ftex, json: fjson };
const texA = { name: "main", url: spritesheet };
const texB = { name: "char", url: char };

const config = auroraConfig({
  userFonts: [yaFont],
  userTextures: [texA, texB],
  HDR: { toneMapping: "aces" },
  camera: { builtInCameraInputs: true },
  feature: {
    bloom: true,
    lighting: true,
  },
  rendering: {
    sortOrder: "y",
  },
});

async function preload() {
  await Aurora.init();
  await create();
  start(0);
}

async function create() {
  await Renderer.initialize(config);
  const l = 25;
  Renderer.setGlobalIllumination([l, l, l]);
}

function start(timestamp: number) {
  AuroraDebugInfo.startCount(timestamp);
  Renderer.beginBatch();
  showLights();
  // showText();
  showSprites();
  // showOrderOFDraw();

  Renderer.endBatch();
  AuroraDebugInfo.endCount();
  AuroraDebugInfo.displayEveryFrame(60, true);
  // x++;
  requestAnimationFrame(start);
}
function showText() {
  Draw.text({
    position: { x: 200, y: 330 },
    font: "ya",
    fontSize: 14,
    text: "Player One",
    fontColor: [255, 0, 255, 150],
  });

  Draw.text({
    position: { x: 300, y: 550 },
    font: "lato",
    fontSize: 62,
    text: "Scalable big text!",
    fontColor: [255, 0, 0, 255],
  });
  Draw.text({
    position: { x: 150, y: 480 },
    font: "ya",
    fontSize: 8,
    text: "this will be a little bit of a problem couse i sure will use even a 8 size",
    fontColor: [255, 255, 255, 255],
  });
}
function showSprites() {
  arr.forEach((el) => {
    Draw.sprite({
      position: { x: el[0], y: el[1] },
      size: { height: 50, width: 50 },
      tint: [255, 255, 255, 255],
      crop: { x: 0, y: 0, width: 32, height: 32 },
      textureToUse: "char",
    });
  });
}
function showOrderOFDraw() {
  let w = 135;
  let h = 114;
  Draw.rect({
    position: { x: 250, y: 250 },
    size: { height: h, width: w },
    tint: [255, 255, 255, 255],
  });
  Draw.rect({
    position: { x: 275, y: 275 },
    size: { height: h, width: w },
    tint: [0, 0, 0, 150],
  });
  Draw.rect({
    position: { x: 300, y: 300 },
    size: { height: h, width: w },
    tint: [0, 255, 0, 150],
  });
  Draw.circle({
    position: { x: 340, y: 340 },
    size: { height: 80, width: 80 },
    tint: [255, 0, 0, 150],
  });
}
function showLights() {
  makeLight({
    intence: 255,
    lightcolor: [255, 70, 70],
    pos: [300, 300],
    size: [100, 100],
    emis: 3,
  });
  makeLight({
    intence: 200,
    lightcolor: [255, 50, 255],
    pos: [50, 50],
    size: [50, 50],
    emis: 3,
  });
  makeLight({
    intence: 200,
    lightcolor: [255, 255, 255],
    pos: [500, 550],
    size: [50, 50],
    emis: 3,
  });
  makeLight({
    intence: 200,
    lightcolor: [255, 255, 50],
    pos: [50, 550],
    size: [50, 50],
    emis: 3,
  });
  makeLight({
    intence: 200,
    lightcolor: [70, 70, 255],
    pos: [550, 50],
    size: [50, 50],
    emis: 5,
  });
}

function makeLight({ intence, lightcolor, pos, size, emis }: t) {
  Draw.rect({
    position: { x: pos[0], y: pos[1] },
    size: { height: size[0], width: size[1] },
    tint: [lightcolor[0], lightcolor[1], lightcolor[2], 255],
    emissive: emis,
  });
  // Draw.pointLight({
  //   position: { x: pos[0], y: pos[1] },
  //   size: { height: size[0] + 300, width: size[1] + 300 },
  //   tint: [lightcolor[0], lightcolor[1], lightcolor[2]],
  //   intensity: intence,
  // });
}

await preload();
