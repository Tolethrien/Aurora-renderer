import "./style.css";
const html = `
<div id="dbgw">
    <p id="dragTitle">some window</p>
    <div id="fps">
        <p class="some">ssssss</p>
        <p class="some">ssssss</p>
        <p class="some">ssssss</p>
    </div>
</div>
`;
type MouseOffset = { x: number; y: number };
export default class DebugWindow {
  private static aurWind: HTMLElement;
  private static dragPoint: HTMLElement;
  private static isDragged: boolean = false;
  private static currentMouseOffset: MouseOffset = { x: 0, y: 0 };
  public static createWindow() {
    const body = document.getElementsByTagName("body")[0];
    if (!body) throw new Error("HTML body required to use AuroraDebugger");
    const template = document.createElement("template");
    template.innerHTML = html;
    body.appendChild(template.content.cloneNode(true));
    const window = document.getElementById("dbgw");
    const dragPoint = document.getElementById("dragTitle");
    if (!window || !dragPoint)
      throw new Error("HTML AuroraDebugger window was not appended");
    this.aurWind = window;
    this.dragPoint = dragPoint;
    this.dragEvent();
  }
  private static dragEvent() {
    this.dragPoint.addEventListener("mousedown", (e) => {
      this.isDragged = true;

      const rect = this.aurWind.getBoundingClientRect();
      this.currentMouseOffset.x = e.clientX - rect.left;
      this.currentMouseOffset.y = e.clientY - rect.top;

      this.aurWind.style.right = "auto";
      this.aurWind.style.left = rect.left + "px";
      this.aurWind.style.top = rect.top + "px";

      document.addEventListener("mousemove", (e) => this.onMouseMove(e));
      document.addEventListener("mouseup", () => this.onMouseUp());
    });
  }
  private static onMouseMove(e: MouseEvent) {
    if (!this.isDragged) return;

    this.aurWind.style.left = `${e.clientX - this.currentMouseOffset.x}px`;
    this.aurWind.style.top = `${e.clientY - this.currentMouseOffset.y}px`;
  }
  private static onMouseUp() {
    this.isDragged = false;
    document.removeEventListener("mousemove", (e) => this.onMouseMove(e));
    document.removeEventListener("mouseup", () => this.onMouseUp());
  }
}
