import { PlacementStore } from "./Placement.js";

/** Application state and commands for the first finite-grid editor workflow. */
export class PlanEditor {
  constructor(database, { id = "local-plan", name = "Untitled Plan", width = 64, height = 64, placements = [] } = {}) {
    this.database = database;
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.placements = new PlacementStore(database, placements);
    this.activeBuildingId = null;
    this.selectedPlacementId = null;
    this.nextPlacementNumber = placements.length + 1;
  }

  selectBuilding(buildingId) {
    if (!this.database.getById(buildingId)) throw new Error(`Unknown building ID: ${buildingId}`);
    this.activeBuildingId = buildingId;
    this.selectedPlacementId = null;
  }

  selectTool() {
    this.activeBuildingId = null;
  }

  clickCell(x, y) {
    if (this.activeBuildingId) return this.placeAt(x, y);
    this.selectedPlacementId = this.findPlacementAt(x, y)?.id ?? null;
    return this.selectedPlacement;
  }

  placeAt(x, y) {
    const building = this.database.getById(this.activeBuildingId);
    if (!building) throw new Error("Select a building before placing it.");
    if (x < 0 || y < 0 || x + building.size.width > this.width || y + building.size.height > this.height) {
      throw new RangeError("The building must fit within the plan grid.");
    }

    const placement = {
      id: `placement-${this.nextPlacementNumber++}`,
      catalogItemId: building.id,
      x,
      y,
      rotation: 0,
      layer: "structures",
    };
    this.placements = this.placements.withPlaced(placement);
    this.selectedPlacementId = placement.id;
    return this.selectedPlacement;
  }

  deleteSelected() {
    if (!this.selectedPlacementId) return false;
    this.placements = this.placements.without(this.selectedPlacementId);
    this.selectedPlacementId = null;
    return true;
  }

  get selectedPlacement() {
    return this.selectedPlacementId ? this.placements.getById(this.selectedPlacementId) : null;
  }

  get scene() {
    return { database: this.database, placements: this.placements.getAll(), selectedPlacementId: this.selectedPlacementId };
  }

  toDocument() {
    return {
      schemaVersion: 1,
      id: this.id,
      name: this.name,
      updatedAt: new Date().toISOString(),
      grid: { width: this.width, height: this.height, cellSize: 1 },
      terrain: [],
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
    });
  }

  findPlacementAt(x, y) {
    return this.placements.getAll().find((placement) => {
      const building = this.database.getById(placement.catalogItemId);
      return x >= placement.x && x < placement.x + building.size.width && y >= placement.y && y < placement.y + building.size.height;
    }) ?? null;
  }
}
