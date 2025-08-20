import "../css/style.css";
import Aurora from "../core/core";
import Draw from "../core//draw";
import char from "./assets/char.png";
import spritesheet from "./assets/radial.png";
import ftex from "./assets/ya-hei-ascii.png";
import fjson from "./assets/ya-hei-ascii-msdf.json";
import AuroraDebugInfo from "../core//debugger/debugInfo";
import auroraConfig from "../core//renderer/config";
import Renderer from "../core//renderer/renderer";
/**
 * today:
 * system sterowania zmiennymi
 * resize i zmiana rozdzialki
 */
interface t {
  lightColor: [number, number, number];
  intense: number;
  pos: [number, number];
  size: [number, number];
  emissive: number;
}
let arr = Array(100)
  .fill(0)
  .map(() => [Math.random() * 854, Math.random() * 480]);

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
    renderRes: "854x480",
    canvasColor: [125, 125, 125, 255],
  },
});

async function preload() {
  await Aurora.init();
  await create();
  start(0);
}
async function create() {
  await Renderer.initialize(config);
  const l = 50;
  Renderer.setGlobalIllumination([l, l, l]);
}
function start(timestamp: number) {
  AuroraDebugInfo.startCount(timestamp);

  Renderer.beginBatch();
  showLights();
  // showText();
  showSprites();
  showStres();
  showUI();
  // showOrderOFDraw();

  Renderer.endBatch();
  AuroraDebugInfo.endCount();
  // AuroraDebugInfo.displayEveryFrame(1, true);
  // AuroraDebugInfo.displayPipelinesTime(1, true);
  requestAnimationFrame(start);
}
function showUI() {
  let clipX = 75;
  let clipY = 82;
  let centX = 82;
  let centY = 1;
  Draw.guiRect({
    position: { x: centX, y: centY, mode: "percent" },
    size: { width: 15, height: 7, mode: "percent" },
    rounded: 0.2,
    tint: [255, 255, 255, 255],
  });
  // Draw.guiRect({
  //   position: { x: clipX, y: clipY - 20, mode: "percent" },
  //   size: { width: 80, height: 60, mode: "pixel" },
  //   rounded: 1,
  //   tint: [0, 0, 0, 130],
  // });
  Draw.guiRect({
    position: { x: centX + 0.5, y: centY + 0.5, mode: "percent" },
    size: { width: 14, height: 6, mode: "percent" },
    rounded: 0.2,
    tint: [200, 0, 0, 255],
  });

  Draw.guiRect({
    position: { x: centX + 0.5, y: centY + 4.5, mode: "percent" },
    size: { width: 14, height: 1, mode: "percent" },
    rounded: 0.2,
    tint: [150, 0, 0, 255],
  });
  Draw.guiRect({
    position: { x: centX + 0.5, y: centY + 5.5, mode: "percent" },
    size: { width: 14, height: 1, mode: "percent" },
    rounded: 0.2,
    tint: [100, 0, 0, 255],
  });

  Draw.guiText({
    position: { x: centX + 4, y: centY + 1, mode: "percent" },
    font: "lato",
    fontSize: { size: 12, mode: "percent" },
    text: `999999`,
    fontColor: [0, 0, 0, 255],
  });
  Draw.clip({
    position: { x: clipX, y: clipY, mode: "percent" },
    size: { width: 20, height: 17.5, mode: "percent" },
  });
  Draw.guiRect({
    position: { x: clipX, y: clipY, mode: "percent" },
    size: { width: 20, height: 17.5, mode: "percent" },
    rounded: 0,
    tint: [0, 0, 0, 130],
  });
  Draw.guiText({
    position: { x: clipX + 1, y: clipY, mode: "percent" },
    font: "lato",
    fontSize: { size: 12, mode: "percent" },
    text: "this is NOT! clipped text",
    fontColor: [100, 255, 100, 255],
  });
  Draw.guiText({
    position: { x: clipX + 1, y: clipY + 5, mode: "percent" },
    font: "lato",
    fontSize: { size: 12, mode: "percent" },
    text: "this IS! definitely clipped text after",
    fontColor: [255, 100, 100, 255],
  });
  Draw.guiText({
    position: { x: clipX + 1, y: clipY + 9, mode: "percent" },
    font: "jersey",
    fontSize: { size: 13, mode: "percent" },
    text: "other font?! whoa!",
    fontColor: [0, 255, 0, 255],
  });
  Draw.guiText({
    position: { x: clipX + 1, y: clipY + 14.5, mode: "percent" },
    font: "lato",
    fontSize: { size: 12, mode: "percent" },
    text: "And this is clipped too!",
    fontColor: [255, 100, 100, 255],
  });
  Draw.popClip();
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
function showStres() {
  if (!AuroraDebugInfo.isWorking) return;
  const sprites = AuroraDebugInfo.getStressTestSprites();
  sprites.forEach((el) => {
    Draw.sprite({
      position: { x: el[0], y: el[1] },
      size: { height: 50, width: 50 },
      tint: [255, 255, 255, 255],
      crop: { x: 0, y: 0, width: 32, height: 32 },
      textureToUse: "char",
    });
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
    intense: 0,
    lightColor: [255, 60, 60],
    pos: [400, 200],
    size: [5, 600],
    emissive: 3,
  });
  makeLight({
    intense: 0,
    lightColor: [255, 255, 60],
    pos: [400, 250],
    size: [5, 600],
    emissive: 3,
  });
  makeLight({
    intense: 0,
    lightColor: [60, 255, 60],
    pos: [400, 300],
    size: [5, 600],
    emissive: 3,
  });
  makeLight({
    intense: 200,
    lightColor: [255, 70, 255],
    pos: [50, 50],
    size: [50, 50],
    emissive: 3,
  });
  makeLight({
    intense: 200,
    lightColor: [255, 255, 255],
    pos: [800, 400],
    size: [50, 50],
    emissive: 2,
  });
  makeLight({
    intense: 200,
    lightColor: [255, 255, 50],
    pos: [50, 400],
    size: [50, 50],
    emissive: 2,
  });
  makeLight({
    intense: 200,
    lightColor: [70, 70, 255],
    pos: [800, 50],
    size: [50, 50],
    emissive: 5,
  });
}

function makeLight({ emissive, lightColor, pos, size, intense }: t) {
  Draw.rect({
    position: { x: pos[0], y: pos[1] },
    size: { height: size[0], width: size[1] },
    tint: [lightColor[0], lightColor[1], lightColor[2], 255],
    emissive: emissive,
  });
  Draw.pointLight({
    position: { x: pos[0], y: pos[1] },
    size: { height: size[0] + 300, width: size[1] + 300 },
    tint: [lightColor[0], lightColor[1], lightColor[2]],
    intensity: intense,
  });
}

await preload();
