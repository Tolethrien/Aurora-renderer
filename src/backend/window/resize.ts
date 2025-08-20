import { mainWindow } from "./window";
export type Resolutions =
  | "16:9 => 1920:1080"
  | "16:9 => 1600:900"
  | "16:9 => 1366:768"
  | "16:9 => 1280:720"
  | "16:9 => 960:540"
  | "16:9 => 640:360"
  | "4:3 => 2048:1536"
  | "4:3 => 1600:1200"
  | "4:3 => 1400:1050"
  | "4:3 => 1280:960"
  | "4:3 => 1152:864"
  | "4:3 => 1024:768"
  | "4:3 => 800:600"
  | "4:3 => 640:480";

export function setSize(res: Resolutions) {
  const newSize = res.split("=>")[1].trim().split(":");
  mainWindow.unmaximize();
  mainWindow.setBounds({
    x: 10,
    y: 0,
    width: Number(newSize[0]),
    height: Number(newSize[1]),
  });
}
export function setFullScreen(bool: boolean) {
  mainWindow.setFullScreen(bool);
}
// export function setBorderlessFullScreen() {
//   //   mainWindow.setTitleBarOverlay({ height: 0 });
//   //TODO: zbuduj własny pasek, użyj widocznosci guzików by potem usuwac ten div i guziki jednoczesnie by wyglądało jak borderless
// }
export function getAppWindowSize() {
  return mainWindow.getSize();
}
