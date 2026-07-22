/** Immutable sparse scalar field for future planning analysis. */
export class Heatmap {
  constructor(values = new Map()) {
    this.values = new Map(values);
  }

  getAt(x, y) {
    return this.values.get(keyFor(x, y)) ?? 0;
  }

  withValueAt(x, y, value) {
    assertValue(value);
    const next = new Map(this.values);
    const key = keyFor(x, y);
    if (value === 0) next.delete(key);
    else next.set(key, value);
    return new Heatmap(next);
  }

  getRange() {
    const values = [...this.values.values()];
    return values.length === 0 ? { minimum: 0, maximum: 0 } : { minimum: Math.min(...values), maximum: Math.max(...values) };
  }

  toCells() {
    return [...this.values.entries()].map(([key, value]) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y, value };
    });
  }
}

function keyFor(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new TypeError("Heatmap coordinates must be integers.");
  }
  return `${x},${y}`;
}

function assertValue(value) {
  if (!Number.isFinite(value)) throw new TypeError("Heatmap value must be finite.");
}
