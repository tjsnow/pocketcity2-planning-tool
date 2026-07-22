/**
 * Immutable sparse terrain map.
 * Terrain IDs are caller-owned strings so this module has no game-data dependency.
 */
export class Terrain {
  constructor({ defaultTerrainId = "unassigned", cells = new Map() } = {}) {
    assertTerrainId(defaultTerrainId);
    this.defaultTerrainId = defaultTerrainId;
    this.cells = new Map(cells);
  }

  getAt(x, y) {
    return this.cells.get(cellKey(x, y)) ?? this.defaultTerrainId;
  }

  withTerrainAt(x, y, terrainId) {
    assertTerrainId(terrainId);
    const nextCells = new Map(this.cells);
    const key = cellKey(x, y);

    if (terrainId === this.defaultTerrainId) {
      nextCells.delete(key);
    } else {
      nextCells.set(key, terrainId);
    }

    return new Terrain({ defaultTerrainId: this.defaultTerrainId, cells: nextCells });
  }

  toCells() {
    return [...this.cells.entries()].map(([key, terrainId]) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y, terrainId };
    });
  }

  static fromCells(cells, defaultTerrainId = "unassigned") {
    if (!Array.isArray(cells)) {
      throw new TypeError("Terrain cells must be an array.");
    }

    let terrain = new Terrain({ defaultTerrainId });
    for (const cell of cells) {
      terrain = terrain.withTerrainAt(cell.x, cell.y, cell.terrainId);
    }

    return terrain;
  }
}

function cellKey(x, y) {
  assertGridCoordinate(x, "x");
  assertGridCoordinate(y, "y");
  return `${x},${y}`;
}

function assertGridCoordinate(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Terrain ${name} coordinate must be an integer.`);
  }
}

function assertTerrainId(terrainId) {
  if (typeof terrainId !== "string" || terrainId.trim().length === 0) {
    throw new TypeError("Terrain ID must be a non-empty string.");
  }
}
