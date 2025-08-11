import Aurora from "./aurora/core";
import "./style.css";
import Draw from "./aurora/urp/draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";
import AuroraDebugInfo from "./aurora/urp/debugger/debugInfo";
import auroraConfig from "./aurora/urp/renderer/config";
import Renderer from "./aurora/urp/renderer/renderer";
import AuroraCamera from "./aurora/urp/camera";
import TempText from "./helps/futureTextPipe";
interface t {
  lightcolor: [number, number, number];
  intence: number;
  pos: [number, number];
  size: [number, number];
  emis: number;
}
const arr = Array(50)
  .fill(0)
  .map(() => [Math.random() * 600, Math.random() * 600]);

const yaFont = { fontName: "ya", img: ftex, json: fjson };
const texA = { name: "main", url: spritesheet };
const texB = { name: "char", url: char };

const config = auroraConfig({
  userFonts: [yaFont],
  userTextures: [texA, texB],
  camera: { builtInCameraInputs: true },
  feature: {
    bloom: true,
    lighting: true,
  },
  bloom: {
    numberOfPasses: 4,
    intense: 1.4,
  },
  rendering: {
    toneMapping: "aces",
    sortOrder: "y",
    renderRes: "800x600",
  },
});

async function preload() {
  await Aurora.init();
  await create();
  start(0);
}

async function create() {
  await Renderer.initialize(config);
  const l = 75;
  Renderer.setGlobalIllumination([l, l, l]);
  Renderer.setScreenSettings({
    exposure: -0.2,
    saturation: 0.2,
  });
  // await TempText.createPipeline();
  // TempText.draw({
  //   position: [0, 0],
  //   color: [10, 101, 10, 10],
  //   scale: 32,
  //   text: "twoja stara",
  // });
}
let h = 0;
let centX = 82;
let centY = 1;
function start(timestamp: number) {
  AuroraDebugInfo.startCount(timestamp);
  Renderer.setScreenSettings({
    hueShift: h,
  });
  h += 2;
  Renderer.beginBatch();
  showLights();
  // showText();
  showSprites();
  // showOrderOFDraw();
  Draw.guiText({
    position: { x: centX + 2.5, y: centY + 2.5, mode: "percent" },
    font: "lato",
    fontSize: 12,
    text: `hueShfft: ${(h + 2) % 360}'`,
    fontColor: [0, 0, 0, 255],
    layer: 4,
  });
  Draw.guiRect({
    position: { x: centX + 1, y: centY + 1, mode: "percent" },
    size: { width: 123, height: 37, mode: "pixel" },
    rounded: 0,
    tint: [255, 0, 0, 255],
    layer: 4,
  });
  Draw.guiRect({
    position: { x: centX, y: centY, mode: "percent" },
    size: { width: 140, height: 49, mode: "pixel" },
    rounded: 0,
    tint: [0, 0, 0, 255],
    layer: 2,
  });

  Renderer.endBatch();
  AuroraDebugInfo.endCount();
  // AuroraDebugInfo.displayEveryFrame(60, true);
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
    position: { x: 550, y: 250 },
    size: { height: 100, width: 100 },
    tint: [255, 255, 255, 255],
  });
  Draw.rect({
    position: { x: 275, y: 275 },
    size: { height: h, width: w },
    tint: [0, 0, 0, 150],
  });
  Draw.circle({
    position: { x: 340, y: 350 },
    size: { height: 80, width: 80 },
    tint: [255, 0, 0, 230],
  });
  Draw.rect({
    position: { x: 300, y: 300 },
    size: { height: h, width: w },
    tint: [0, 255, 0, 150],
  });
}
function showLights() {
  makeLight({
    intence: 0,
    lightcolor: [255, 60, 60],
    pos: [300, 300],
    size: [5, 600],
    emis: 3,
  });
  makeLight({
    intence: 0,
    lightcolor: [255, 255, 60],
    pos: [300, 350],
    size: [5, 600],
    emis: 3,
  });
  makeLight({
    intence: 0,
    lightcolor: [60, 255, 60],
    pos: [300, 400],
    size: [5, 600],
    emis: 3,
  });
  makeLight({
    intence: 200,
    lightcolor: [255, 70, 255],
    pos: [50, 50],
    size: [50, 50],
    emis: 3,
  });
  makeLight({
    intence: 200,
    lightcolor: [255, 255, 255],
    pos: [500, 550],
    size: [50, 50],
    emis: 2,
  });
  makeLight({
    intence: 200,
    lightcolor: [255, 255, 50],
    pos: [50, 550],
    size: [50, 50],
    emis: 2,
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
  Draw.pointLight({
    position: { x: pos[0], y: pos[1] },
    size: { height: size[0] + 300, width: size[1] + 300 },
    tint: [lightcolor[0], lightcolor[1], lightcolor[2]],
    intensity: intence,
  });
}

await preload();
