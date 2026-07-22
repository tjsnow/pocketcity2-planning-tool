/** Small read-only overview renderer independent from the main Canvas renderer. */
export class Minimap {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("Minimap requires a canvas.");
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) throw new Error("Minimap Canvas 2D rendering is unavailable.");
    this.scene = null;
    this.camera = null;
    this.renderFrameId = null;
  }
  setScene(scene) { this.scene = scene; this.requestRender(); }
  setCamera(camera) { this.camera = camera; this.requestRender(); }
  requestRender() {
    if (this.renderFrameId !== null) return;
    if (typeof requestAnimationFrame !== "function") { this.render(); return; }
    this.renderFrameId = requestAnimationFrame(() => { this.renderFrameId = null; this.render(); });
  }
  render() {
    if (!this.scene) return;
    const width = this.canvas.clientWidth || 180;
    const height = this.canvas.clientHeight || 140;
    const scale = Math.min(width / this.scene.width, height / this.scene.height);
    const offsetX = (width - this.scene.width * scale) / 2;
    const offsetY = (height - this.scene.height * scale) / 2;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const context = this.context;
    context.fillStyle = "#11161b"; context.fillRect(0, 0, width, height);
    for (const cell of this.scene.terrain?.toCells?.() ?? []) {
      context.fillStyle = terrainColor(cell.terrainId);
      context.fillRect(offsetX + cell.x * scale, offsetY + (this.scene.height - cell.y - 1) * scale, Math.max(1, scale), Math.max(1, scale));
    }
    for (const road of this.scene.roads ?? []) {
      context.fillStyle = roadColor(road.roadType);
      for (const cell of roadCells(road)) context.fillRect(offsetX + cell.x * scale, offsetY + (this.scene.height - cell.y - 1) * scale, Math.max(1, scale), Math.max(1, scale));
    }
    context.fillStyle = "#3971b3";
    for (const placement of this.scene.placements ?? []) context.fillRect(offsetX + placement.x * scale, offsetY + (this.scene.height - placement.y - 1) * scale, Math.max(2, scale), Math.max(2, scale));
    if (this.camera) {
      const viewWidth = this.camera.viewportWidth / this.camera.zoom / 32;
      const viewHeight = this.camera.viewportHeight / this.camera.zoom / 32;
      const viewX = this.camera.positionX / 32 - viewWidth / 2;
      const viewY = this.scene.height - this.camera.positionY / 32 - viewHeight / 2;
      context.strokeStyle = "#f0f4f8"; context.lineWidth = 1; context.strokeRect(offsetX + viewX * scale, offsetY + viewY * scale, viewWidth * scale, viewHeight * scale);
    }
  }
  destroy() { if (this.renderFrameId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.renderFrameId); this.renderFrameId = null; }
}
function roadCells(road) { return road.direction === "vertical" ? [{ x: road.x, y: road.y }, { x: road.x, y: road.y + 1 }] : [{ x: road.x, y: road.y }, { x: road.x + 1, y: road.y }]; }
function roadColor(type) { return { road: "#c7a36a", "high-density": "#e0e4eb", dirt: "#c49a62", pedestrian: "#b4e0bd", boardwalk: "#e2b477", "light-rail": "#79b8ff", "train-rail": "#d0d4dc", "high-rail": "#d7a9ff", subway: "#8be2df" }[type] ?? "#c7a36a"; }
function terrainColor(type) { return { water: "#1c557e", sand: "#c9ad70", soil: "#78543d", grass: "#2f6041", canal: "#287da0", "planted-tree": "#4e8a4d", "wild-tree": "#245c35", mountains: "#6f7780", "palm-tree": "#4c8b63" }[type] ?? "#2f6041"; }
