import { PlacementStore } from "./Placement.js";
import { Terrain } from "./Terrain.js";

/** Application state and commands for the first finite-grid editor workflow. */
export class PlanEditor {
  constructor(database, { id = "local-plan", name = "Untitled Plan", width = 64, height = 64, placements = [], terrain = [] } = {}) {
    this.database = database;
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.placements = new PlacementStore(database, placements);
    this.terrain = Terrain.fromCells(terrain);
    this.activeBuildingId = null;
    this.activeTerrainId = null;
    this.selectedPlacementId = null;
    this.nextPlacementNumber = placements.length + 1;
    this.undoStack = [];
    this.redoStack = [];
  }

  selectBuilding(buildingId) {
    if (!this.database.getById(buildingId)) throw new Error(`Unknown building ID: ${buildingId}`);
    this.activeBuildingId = buildingId;
    this.activeTerrainId = null;
    this.selectedPlacementId = null;
  }

  selectTool() {
    this.activeBuildingId = null;
    this.activeTerrainId = null;
  }

  selectTerrain(terrainId) {
    this.activeTerrainId = terrainId;
    this.activeBuildingId = null;
    this.selectedPlacementId = null;
  }

  clickCell(x, y) {
    if (this.activeTerrainId) return this.paintTerrainAt(x, y);
    if (this.activeBuildingId) return this.placeAt(x, y);
    this.selectedPlacementId = this.findPlacementAt(x, y)?.id ?? null;
    return this.selectedPlacement;
  }

  paintTerrainAt(x, y) {
    this.assertInBounds(x, y);
    if (this.terrain.getAt(x, y) === this.activeTerrainId) return null;
    this.recordHistory();
    this.terrain = this.terrain.withTerrainAt(x, y, this.activeTerrainId);
    this.selectedPlacementId = null;
    return null;
  }

  placeAt(x, y) {
    const building = this.database.getById(this.activeBuildingId);
    if (!building) throw new Error("Select a building before placing it.");
    if (x < 0 || y < 0 || x + building.size.width > this.width || y + building.size.height > this.height) {
      throw new RangeError("The building must fit within the plan grid.");
    }
    for (let cellY = y; cellY < y + building.size.height; cellY += 1) {
      for (let cellX = x; cellX < x + building.size.width; cellX += 1) {
        if (this.terrain.getAt(cellX, cellY) === "water") throw new Error("Buildings cannot be placed on water.");
      }
    }

    const placement = {
      id: `placement-${this.nextPlacementNumber++}`,
      catalogItemId: building.id,
      x,
      y,
      rotation: 0,
      layer: "structures",
    };
    this.recordHistory();
    this.placements = this.placements.withPlaced(placement);
    this.selectedPlacementId = placement.id;
    return this.selectedPlacement;
  }

  deleteSelected() {
    if (!this.selectedPlacementId) return false;
    this.recordHistory();
    this.placements = this.placements.without(this.selectedPlacementId);
    this.selectedPlacementId = null;
    return true;
  }

  get canUndo() { return this.undoStack.length > 0; }

  get canRedo() { return this.redoStack.length > 0; }

  undo() {
    if (!this.canUndo) return false;
    this.redoStack.push(this.snapshot());
    this.restore(this.undoStack.pop());
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    this.undoStack.push(this.snapshot());
    this.restore(this.redoStack.pop());
    return true;
  }

  get selectedPlacement() {
    return this.selectedPlacementId ? this.placements.getById(this.selectedPlacementId) : null;
  }

  get scene() {
    return { database: this.database, terrain: this.terrain, placements: this.placements.getAll(), selectedPlacementId: this.selectedPlacementId };
  }

  toDocument() {
    return {
      schemaVersion: 1,
      id: this.id,
      name: this.name,
      updatedAt: new Date().toISOString(),
      grid: { width: this.width, height: this.height, cellSize: 1 },
      terrain: this.terrain.toCells(),
      placements: this.placements.getAll(),
      notes: [],
    };
  }

  static fromDocument(database, document) {
    if (!document || document.schemaVersion !== 1 || !document.grid || !Array.isArray(document.placements)) {
      throw new TypeError("Unsupported or invalid plan document.");
    }
    if (!Number.isInteger(document.grid.width) || !Number.isInteger(document.grid.height)) {
      throw new TypeError("Plan grid dimensions must be integers.");
    }
    return new PlanEditor(database, {
      id: typeof document.id === "string" ? document.id : "imported-plan",
      name: typeof document.name === "string" ? document.name : "Imported Plan",
      width: document.grid.width,
      height: document.grid.height,
      placements: document.placements,
      terrain: Array.isArray(document.terrain) ? document.terrain : [],
    });
  }

  findPlacementAt(x, y) {
    return this.placements.getAll().find((placement) => {
      const building = this.database.getById(placement.catalogItemId);
      return x >= placement.x && x < placement.x + building.size.width && y >= placement.y && y < placement.y + building.size.height;
    }) ?? null;
  }

  recordHistory() {
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
  }

  snapshot() {
    return { placements: this.placements.getAll(), terrain: this.terrain.toCells(), nextPlacementNumber: this.nextPlacementNumber };
  }

  restore(snapshot) {
    this.placements = new PlacementStore(this.database, snapshot.placements);
    this.terrain = Terrain.fromCells(snapshot.terrain);
    this.nextPlacementNumber = snapshot.nextPlacementNumber;
    this.selectedPlacementId = null;
  }

  assertInBounds(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.width || y >= this.height) {
      throw new RangeError("Terrain cell must be within the plan grid.");
    }
  }
}
