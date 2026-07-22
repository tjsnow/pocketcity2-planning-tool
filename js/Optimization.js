/** Read-only planning diagnostics. It reports geometry risks without mutating plan state or simulating the game. */
export function analyzePlan({ width, height, placements = [], roads = [] }, database) {
  const issues = [];
  const occupied = new Map();
  const roadCells = new Set();

  for (const road of roads) {
    for (const cell of roadCellsFor(road)) roadCells.add(key(cell));
  }

  for (const placement of placements) {
    const building = database.getById(placement.catalogItemId);
    if (!building) continue;
    for (const cell of footprintCells(placement, building)) {
      const cellKey = key(cell);
      if (!occupied.has(cellKey)) occupied.set(cellKey, placement.id);
    }
  }

  for (const placement of placements) {
    const building = database.getById(placement.catalogItemId);
    if (!building) {
      issues.push(issue("unknown-building", "warning", placement.id, `Unknown building catalog item: ${placement.catalogItemId}.`));
      continue;
    }
    for (const cell of footprintCells(placement, building)) {
      const cellKey = key(cell);
      const existing = occupied.get(cellKey);
      if (existing && existing !== placement.id) issues.push(issue("building-overlap", "error", placement.id, `Building overlaps placement ${existing} at ${cellKey}.`));
      if (roadCells.has(cellKey)) issues.push(issue("road-overlap", "error", placement.id, `Building shares a cell with a road at ${cellKey}.`));
    }
    if (!hasUtilityAccess(placement, building, roadCells, occupied)) {
      issues.push(issue("no-utility-access", "error", placement.id, `${building.name} cannot receive utilities from the road network: no adjacent road or occupied one-cell connection.`));
    }
  }

  for (const road of roads) {
    const cells = roadCellsFor(road);
    if (!cells.some((cell) => hasNeighborRoad(cell, road, roads))) {
      issues.push(issue("isolated-road", "info", `${road.x},${road.y},${road.direction}`, "Road segment has no connected neighboring segment."));
    }
  }

  return Object.freeze({ width, height, issueCount: issues.length, issues: Object.freeze(issues) });
}

function footprintCells(placement, building) {
  const rotated = placement.rotation === 90 || placement.rotation === 270;
  const width = rotated ? building.size.height : building.size.width;
  const height = rotated ? building.size.width : building.size.height;
  const cells = [];
  for (let y = placement.y; y < placement.y + height; y += 1) {
    for (let x = placement.x; x < placement.x + width; x += 1) cells.push({ x, y });
  }
  return cells;
}

function roadCellsFor(road) {
  return road.direction === "vertical" ? [{ x: road.x, y: road.y }, { x: road.x, y: road.y + 1 }] : [{ x: road.x, y: road.y }, { x: road.x + 1, y: road.y }];
}

function hasUtilityAccess(placement, building, roadCells, occupied) {
  return footprintCells(placement, building).some((cell) => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const adjacent = { x: cell.x + dx, y: cell.y + dy };
      if (roadCells.has(key(adjacent))) return true;
      if (occupied.has(key(adjacent)) && occupied.get(key(adjacent)) !== placement.id && roadCells.has(key({ x: cell.x + dx * 2, y: cell.y + dy * 2 }))) return true;
    }
    return false;
  });
}

function hasNeighborRoad(cell, road, roads) {
  return roads.some((other) => other !== road && roadCellsFor(other).some((candidate) => Math.abs(candidate.x - cell.x) + Math.abs(candidate.y - cell.y) <= 1));
}

function issue(code, severity, subjectId, message) { return Object.freeze({ code, severity, subjectId, message }); }
function key(cell) { return `${cell.x},${cell.y}`; }
