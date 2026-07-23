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

/** Finds one-cell gaps between road endpoints that should render as automatic links. */
export function adjacentRoadEndConnections(segments = []) {
  const endpoints = segments.flatMap((road, segmentIndex) => {
    const start = { x: road.x, y: road.y, roadType: road.roadType ?? "road", segmentIndex };
    const end = road.direction === "horizontal"
      ? { x: road.x + 1, y: road.y, roadType: road.roadType ?? "road", segmentIndex }
      : { x: road.x, y: road.y + 1, roadType: road.roadType ?? "road", segmentIndex };
    return [start, end];
  });
  const endpointUseCount = new Map();
  for (const endpoint of endpoints) {
    const endpointKey = `${endpoint.x},${endpoint.y}`;
    endpointUseCount.set(endpointKey, (endpointUseCount.get(endpointKey) ?? 0) + 1);
  }
  const exposedEndpoints = endpoints.filter((endpoint) => endpointUseCount.get(`${endpoint.x},${endpoint.y}`) === 1);
  const connections = [];
  for (let left = 0; left < exposedEndpoints.length; left += 1) {
    for (let right = left + 1; right < exposedEndpoints.length; right += 1) {
      const from = exposedEndpoints[left];
      const to = exposedEndpoints[right];
      if (from.segmentIndex === to.segmentIndex) continue;
      if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) continue;
      connections.push({ from, to });
    }
  }
  return connections;
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
