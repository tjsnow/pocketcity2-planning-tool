/**
 * Browser-independent world viewport.
 * Coordinates passed to this class are CSS pixels and logical world units.
 */
export class Camera {
  constructor({ zoom = 1, minimumZoom = 0.25, maximumZoom = 4 } = {}) {
    this.zoom = zoom;
    this.minimumZoom = minimumZoom;
    this.maximumZoom = maximumZoom;
    this.positionX = 0;
    this.positionY = 0;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
  }

  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  panByScreen(deltaX, deltaY) {
    this.positionX -= deltaX / this.zoom;
    this.positionY += deltaY / this.zoom;
  }

  zoomAt(screenPoint, requestedZoom) {
    const worldPoint = this.screenToWorld(screenPoint);
    this.zoom = clamp(requestedZoom, this.minimumZoom, this.maximumZoom);
    const pointAfterZoom = this.screenToWorld(screenPoint);

    this.positionX += worldPoint.x - pointAfterZoom.x;
    this.positionY += worldPoint.y - pointAfterZoom.y;
  }

  worldToScreen({ x, y }) {
    return {
      x: (x - this.positionX) * this.zoom + this.viewportWidth / 2,
      y: (this.positionY - y) * this.zoom + this.viewportHeight / 2,
    };
  }

  screenToWorld({ x, y }) {
    return {
      x: (x - this.viewportWidth / 2) / this.zoom + this.positionX,
      y: this.positionY - (y - this.viewportHeight / 2) / this.zoom,
    };
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
