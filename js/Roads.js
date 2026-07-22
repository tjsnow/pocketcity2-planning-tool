/** Immutable collection of grid-aligned road segments. */
export class RoadNetwork {
  constructor(segments = []) {
    this.segmentsByKey = new Map();
    for (const segment of segments) {
      const normalized = normalizeSegment(segment);
      if (this.segmentsByKey.has(normalized.key)) {
        throw new Error(`Duplicate road segment: ${normalized.key}`);
      }
      this.segmentsByKey.set(normalized.key, Object.freeze(normalized));
    }
  }

  getAll() {
    return [...this.segmentsByKey.values()].map(({ key, ...segment }) => segment);
  }

  hasSegment(segment) {
    return this.segmentsByKey.has(normalizeSegment(segment).key);
  }

  withSegment(segment) {
    const normalized = normalizeSegment(segment);
    const next = this.getAll();
    if (!this.segmentsByKey.has(normalized.key)) next.push(segment);
    return new RoadNetwork(next);
  }

  withoutSegment(segment) {
    const key = normalizeSegment(segment).key;
    return new RoadNetwork(this.getAll().filter((existing) => normalizeSegment(existing).key !== key));
  }
}

function normalizeSegment(segment) {
  if (!segment || typeof segment !== "object") {
    throw new TypeError("Road segment must be an object.");
  }

  assertCoordinate(segment.x, "x");
  assertCoordinate(segment.y, "y");
  if (segment.direction !== "horizontal" && segment.direction !== "vertical") {
    throw new TypeError("Road segment direction must be horizontal or vertical.");
  }

  const roadType = segment.roadType ?? "road";
  if (typeof roadType !== "string" || roadType.trim().length === 0) {
    throw new TypeError("Road segment roadType must be a non-empty string.");
  }

  return {
    x: segment.x,
    y: segment.y,
    direction: segment.direction,
    roadType,
    key: `${segment.x},${segment.y},${segment.direction}`,
  };
}

function assertCoordinate(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Road ${name} coordinate must be an integer.`);
  }
}
