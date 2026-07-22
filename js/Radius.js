const METRICS = new Set(["euclidean", "manhattan"]);

/** Pure grid-radius geometry with explicit distance semantics. */
export class Radius {
  constructor({ radius, metric = "euclidean" }) {
    if (!Number.isFinite(radius) || radius < 0) {
      throw new RangeError("Radius must be a non-negative finite number.");
    }
    if (!METRICS.has(metric)) throw new TypeError("Radius metric must be euclidean or manhattan.");
    this.radius = radius;
    this.metric = metric;
  }

  contains(origin, target) {
    return this.distance(origin, target) <= this.radius;
  }

  distance(origin, target) {
    assertPoint(origin, "origin");
    assertPoint(target, "target");
    const deltaX = Math.abs(target.x - origin.x);
    const deltaY = Math.abs(target.y - origin.y);
    return this.metric === "manhattan" ? deltaX + deltaY : Math.hypot(deltaX, deltaY);
  }

  cellsAround(origin) {
    assertPoint(origin, "origin");
    const extent = Math.ceil(this.radius);
    const cells = [];
    for (let y = origin.y - extent; y <= origin.y + extent; y += 1) {
      for (let x = origin.x - extent; x <= origin.x + extent; x += 1) {
        const target = { x, y };
        if (this.contains(origin, target)) cells.push(target);
      }
    }
    return cells;
  }
}

function assertPoint(point, name) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new TypeError(`Radius ${name} must have integer x and y coordinates.`);
  }
}
