import { Camera } from "./Camera.js";
import { Grid } from "./Grid.js";
import { OverlayRegistry } from "./Overlays.js";

const BACKGROUND_COLOR = "#171b20";

/**
 * Isolated Canvas rendering engine.
 * It owns Canvas sizing, the render loop, and viewport navigation only.
 */
export class Renderer {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Renderer requires an HTML canvas element.");
    }

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D rendering is unavailable in this browser.");
    }

    this.canvas = canvas;
    this.context = context;
    this.camera = new Camera();
    this.grid = new Grid();
    this.overlays = new OverlayRegistry();
    this.cssWidth = 0;
    this.cssHeight = 0;
    this.devicePixelRatio = 1;
    this.animationFrameId = null;
    this.activePan = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.bindNavigationEvents();
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

    const dimensionsChanged =
      width !== this.cssWidth ||
      height !== this.cssHeight ||
      pixelRatio !== this.devicePixelRatio;

    if (!dimensionsChanged) return;

    this.cssWidth = width;
    this.cssHeight = height;
    this.devicePixelRatio = pixelRatio;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.camera.setViewport(width, height);
    this.requestRender();
  }

  requestRender() {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.render();
    });
  }

  render() {
    this.context.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.context.clearRect(0, 0, this.cssWidth, this.cssHeight);
    this.drawBackground();
    this.grid.draw(this.context, this.camera, this.cssWidth, this.cssHeight);
    this.overlays.draw(this.context, this.camera, this.cssWidth, this.cssHeight);
  }

  addOverlay(overlay) {
    this.overlays.add(overlay);
    this.requestRender();
  }

  removeOverlay(id) {
    const removed = this.overlays.remove(id);
    if (removed) this.requestRender();
    return removed;
  }

  drawBackground() {
    this.context.fillStyle = BACKGROUND_COLOR;
    this.context.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  destroy() {
    this.resizeObserver.disconnect();
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
  }

  bindNavigationEvents() {
    this.canvas.addEventListener("pointerdown", (event) => this.beginPan(event));
    this.canvas.addEventListener("pointermove", (event) => this.pan(event));
    this.canvas.addEventListener("pointerup", () => this.endPan());
    this.canvas.addEventListener("pointercancel", () => this.endPan());
    this.canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
  }

  beginPan(event) {
    const canPan = event.pointerType === "touch" || event.button === 1 || event.shiftKey;
    if (!canPan) return;

    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.activePan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  pan(event) {
    if (!this.activePan || event.pointerId !== this.activePan.pointerId) return;

    const deltaX = event.clientX - this.activePan.x;
    const deltaY = event.clientY - this.activePan.y;
    this.activePan = { ...this.activePan, x: event.clientX, y: event.clientY };
    this.camera.panByScreen(deltaX, deltaY);
    this.requestRender();
  }

  endPan() {
    this.activePan = null;
  }

  zoom(event) {
    event.preventDefault();
    const pointer = this.eventToCanvasPoint(event);
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    this.camera.zoomAt(pointer, this.camera.zoom * zoomFactor);
    this.requestRender();
  }

  eventToCanvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
}
