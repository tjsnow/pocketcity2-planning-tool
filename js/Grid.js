const MINOR_GRID_COLOR = "#232a32";
const MAJOR_GRID_COLOR = "#303a45";

/**
 * Browser-independent grid geometry and Canvas drawing.
 * Coordinates are logical world units; drawing is performed in CSS pixels.
 */
export class Grid {
  constructor({ cellSize = 32, majorLineInterval = 5 } = {}) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new RangeError("Grid cellSize must be a positive number.");
    }

    if (!Number.isInteger(majorLineInterval) || majorLineInterval < 1) {
      throw new RangeError("Grid majorLineInterval must be a positive integer.");
    }

    this.cellSize = cellSize;
    this.majorLineInterval = majorLineInterval;
  }

  draw(context, camera, viewportWidth, viewportHeight) {
    const topLeft = camera.screenToWorld({ x: 0, y: 0 });
    const bottomRight = camera.screenToWorld({ x: viewportWidth, y: viewportHeight });
    const minimumX = Math.min(topLeft.x, bottomRight.x);
    const maximumX = Math.max(topLeft.x, bottomRight.x);
    const minimumY = Math.min(topLeft.y, bottomRight.y);
    const maximumY = Math.max(topLeft.y, bottomRight.y);

    const startX = this.firstLineAtOrBefore(minimumX);
    const startY = this.firstLineAtOrBefore(minimumY);

    context.save();
    context.lineWidth = 1;
    this.drawLines(context, camera, startX, maximumX, "vertical", MINOR_GRID_COLOR);
    this.drawLines(context, camera, startY, maximumY, "horizontal", MINOR_GRID_COLOR);
    this.drawLines(context, camera, startX, maximumX, "vertical", MAJOR_GRID_COLOR, true);
    this.drawLines(context, camera, startY, maximumY, "horizontal", MAJOR_GRID_COLOR, true);
    context.restore();
  }

  firstLineAtOrBefore(coordinate) {
    return Math.floor(coordinate / this.cellSize) * this.cellSize;
  }

  drawLines(context, camera, start, maximum, orientation, color, majorOnly = false) {
    context.beginPath();
    context.strokeStyle = color;

    for (let coordinate = start; coordinate <= maximum + this.cellSize; coordinate += this.cellSize) {
      const cellIndex = Math.round(coordinate / this.cellSize);
      const isMajorLine = cellIndex % this.majorLineInterval === 0;
      if (majorOnly !== isMajorLine) continue;

      const screenPoint = orientation === "vertical"
        ? camera.worldToScreen({ x: coordinate, y: 0 })
        : camera.worldToScreen({ x: 0, y: coordinate });
      const pixel = alignToPixel(orientation === "vertical" ? screenPoint.x : screenPoint.y);

      if (orientation === "vertical") {
        context.moveTo(pixel, 0);
        context.lineTo(pixel, camera.viewportHeight);
      } else {
        context.moveTo(0, pixel);
        context.lineTo(camera.viewportWidth, pixel);
      }
    }

    context.stroke();
  }
}

function alignToPixel(value) {
  return Math.round(value) + 0.5;
}
