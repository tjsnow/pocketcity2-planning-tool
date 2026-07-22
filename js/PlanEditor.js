import { PlacementStore } from "./Placement.js";
import { Terrain } from "./Terrain.js";
import { RoadNetwork } from "./Roads.js";
import { calculatePlanStatistics } from "./Statistics.js";
import { DistrictStore } from "./Districts.js";
import { NoteStore } from "./PlanningTools.js";
import { analyzePlan } from "./Optimization.js";
import { LayerState } from "./Layers.js";

/** Application state and commands for the first finite-grid editor workflow. */
export class PlanEditor {
  constructor(database, { id = "local-plan", name = "Untitled Plan", width = 64, height = 64, placements = [], terrain = [], roads = [], districts = [], notes = [], layers = {} } = {}) {
    this.database = database;
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.placements = new PlacementStore(database, placements);
    this.terrain = Terrain.fromCells(terrain);
    this.roads = new RoadNetwork(roads);
    this.districts = new DistrictStore(districts);
    this.notes = new NoteStore(notes);
    this.layers = new LayerState(layers);
    this.activeBuildingId = null;
    this.activeTerrainId = null;
    this.activeRoadDirection = null;
    this.activeRoadTool = false;
    this.activeRoadErase = false;
    this.activeBulldozer = false;
    this.activeRoadType = "road";
    this.selectedPlacementId = null;
    this.nextPlacementNumber = placements.length + 1;
    this.undoStack = [];
    this.redoStack = [];
    this.terrainStrokeActive = false;
    this.terrainStrokeHistoryRecorded = false;
    this.roadStrokeActive = false;
    this.roadStrokeHistoryRecorded = false;
  }

  selectBuilding(buildingId) {
    if (!this.database.getById(buildingId)) throw new Error(`Unknown building ID: ${buildingId}`);
    this.activeBuildingId = buildingId;
    this.activeTerrainId = null;
    this.activeRoadDirection = null;
    this.activeRoadTool = false;
    this.activeRoadErase = false;
    this.activeBulldozer = false;
    this.selectedPlacementId = null;
  }

  selectTool() {
    this.activeBuildingId = null;
    this.activeTerrainId = null;
    this.activeRoadDirection = null;
    this.activeRoadTool = false;
    this.activeRoadErase = false;
    this.activeBulldozer = false;
  }

  selectTerrain(terrainId) {
    this.activeTerrainId = terrainId;
    this.activeBuildingId = null;
    this.activeRoadDirection = null;
    this.selectedPlacementId = null;
  }

  selectRoad(direction) {
    if (direction !== null && direction !== undefined && direction !== "horizontal" && direction !== "vertical") throw new TypeError("Road direction is invalid.");
    this.activeRoadDirection = direction;
    this.activeRoadTool = true;
    this.activeRoadErase = false;
    this.activeBulldozer = false;
    this.activeBuildingId = null;
    this.activeTerrainId = null;
    this.selectedPlacementId = null;
  }

  selectRoadTool(roadType = "road") {
    this.selectRoad(null);
    this.activeRoadType = roadType;
  }

  selectRoadEraser() {
    this.selectRoad(null);
    this.activeRoadErase = true;
  }

  selectBulldozer() {
    this.activeBuildingId = null;
    this.activeTerrainId = null;
    this.activeRoadTool = false;
    this.activeRoadErase = false;
    this.activeBulldozer = true;
    this.selectedPlacementId = null;
  }

  clickCell(x, y) {
    if (this.activeBulldozer) return this.deleteAtCell(x, y);
    if (this.activeTerrainId) return this.paintTerrainAt(x, y);
    if (this.activeRoadTool) return this.toggleRoadAt(x, y);
    if (this.activeBuildingId) return this.placeAt(x, y);
    this.selectedPlacementId = this.findPlacementAt(x, y)?.id ?? null;
    return this.selectedPlacement;
  }

  deleteAtCell(x, y) {
    this.assertInBounds(x, y);
    const placement = this.findPlacementAt(x, y);
    if (placement) {
      this.recordHistory();
      this.placements = this.placements.without(placement.id);
      this.selectedPlacementId = null;
      return true;
    }
    const matches = this.roads.getAll().filter((road) => this.roadSegmentCells(road).some((cell) => cell.x === x && cell.y === y));
    if (matches.length === 0) return false;
    this.recordHistory();
    for (const road of matches) this.roads = this.roads.withoutSegment(road);
    return true;
  }

  paintRoadPathTo(x, y) {
    this.assertInBounds(x, y);
    if (!this.roadStrokeLastCell) {
      this.roadStrokeLastCell = { x, y };
      return;
    }
    let current = this.roadStrokeLastCell;
    const segments = [];
    while (current.x !== x || current.y !== y) {
      const horizontal = Math.abs(x - current.x) >= Math.abs(y - current.y);
      const next = horizontal ? { x: current.x + Math.sign(x - current.x), y: current.y } : { x: current.x, y: current.y + Math.sign(y - current.y) };
      const segment = horizontal ? { x: Math.min(current.x, next.x), y: current.y, direction: "horizontal", roadType: this.activeRoadType } : { x: current.x, y: Math.min(current.y, next.y), direction: "vertical", roadType: this.activeRoadType };
      if (!this.activeRoadErase && this.isRoadSegmentBlockedByBuilding(segment)) throw new Error("Roads cannot overlap buildings.");
      segments.push(segment);
      current = next;
    }
    if (segments.length > 0 && !this.roadStrokeHistoryRecorded) {
      this.recordHistory();
      this.roadStrokeHistoryRecorded = true;
    }
    for (const segment of segments) {
      if (this.activeRoadErase) {
        for (const existing of this.roads.getAll()) {
          if (this.roadSegmentCells(existing).some((cell) => this.roadSegmentCells(segment).some((target) => cell.x === target.x && cell.y === target.y))) {
            this.roads = this.roads.withoutSegment(existing);
          }
        }
      } else if (!this.roads.hasSegment(segment)) this.roads = this.roads.withSegment(segment);
    }
    this.roadStrokeLastCell = current;
    this.selectedPlacementId = null;
  }

  toggleRoadAt(x, y) {
    this.assertInBounds(x, y);
    if (this.activeRoadErase) {
      const matches = this.roads.getAll().filter((road) => this.roadSegmentCells(road).some((cell) => cell.x === x && cell.y === y));
      if (matches.length === 0) return null;
      this.recordHistory();
      for (const road of matches) this.roads = this.roads.withoutSegment(road);
      this.selectedPlacementId = null;
      return null;
    }
    const segment = { x, y, direction: this.activeRoadDirection ?? "horizontal", roadType: this.activeRoadType };
    this.recordHistory();
    if (!this.roads.hasSegment(segment) && this.isRoadSegmentBlockedByBuilding(segment)) throw new Error("Roads cannot overlap buildings.");
    this.roads = this.roads.hasSegment(segment) ? this.roads.withoutSegment(segment) : this.roads.withSegment(segment);
    this.selectedPlacementId = null;
    return null;
  }

  addRoadAt(x, y) {
    this.assertInBounds(x, y);
    const segment = { x, y, direction: this.activeRoadDirection, roadType: this.activeRoadType };
    if (this.roads.hasSegment(segment)) return;
    if (this.isRoadSegmentBlockedByBuilding(segment)) throw new Error("Roads cannot overlap buildings.");
    if (!this.roadStrokeActive || !this.roadStrokeHistoryRecorded) {
      this.recordHistory();
      this.roadStrokeHistoryRecorded = true;
    }
    this.roads = this.roads.withSegment(segment);
    this.selectedPlacementId = null;
  }

  beginRoadStroke() {
    this.roadStrokeActive = true;
    this.roadStrokeHistoryRecorded = false;
    this.roadStrokeLastCell = null;
  }

  endRoadStroke() {
    this.roadStrokeActive = false;
    this.roadStrokeHistoryRecorded = false;
    this.roadStrokeLastCell = null;
  }

  paintTerrainAt(x, y) {
    this.assertInBounds(x, y);
    if (this.terrain.getAt(x, y) === this.activeTerrainId) return null;
    if (!this.terrainStrokeActive || !this.terrainStrokeHistoryRecorded) {
      this.recordHistory();
      this.terrainStrokeHistoryRecorded = true;
    }
    this.terrain = this.terrain.withTerrainAt(x, y, this.activeTerrainId);
    this.selectedPlacementId = null;
    return null;
  }

  beginTerrainStroke() {
    this.terrainStrokeActive = true;
    this.terrainStrokeHistoryRecorded = false;
  }

  endTerrainStroke() {
    this.terrainStrokeActive = false;
    this.terrainStrokeHistoryRecorded = false;
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
        if (this.isRoadCell(cellX, cellY)) throw new Error("Buildings cannot overlap roads.");
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

  rotateSelected() {
    const placement = this.selectedPlacement;
    if (!placement) return false;
    const rotation = ((placement.rotation ?? 0) + 90) % 360;
    const building = this.database.getById(placement.catalogItemId);
    const width = rotation === 90 || rotation === 270 ? building.size.height : building.size.width;
    const height = rotation === 90 || rotation === 270 ? building.size.width : building.size.height;
    if (placement.x + width > this.width || placement.y + height > this.height) throw new Error("Rotation would exceed the plan grid.");
    for (let y = placement.y; y < placement.y + height; y += 1) {
      for (let x = placement.x; x < placement.x + width; x += 1) {
        if (this.terrain.getAt(x, y) === "water") throw new Error("Rotation would place the building on water.");
        if (this.isRoadCell(x, y)) throw new Error("Rotation would overlap a road.");
      }
    }
    this.recordHistory();
    this.placements = this.placements.withReplaced(placement.id, { ...placement, rotation });
    return true;
  }

  moveSelected(deltaX, deltaY) {
    const placement = this.selectedPlacement;
    if (!placement) return false;
    if (!Number.isInteger(deltaX) || !Number.isInteger(deltaY)) throw new TypeError("Move distance must use whole cells.");
    const candidate = { ...placement, x: placement.x + deltaX, y: placement.y + deltaY };
    const building = this.database.getById(candidate.catalogItemId);
    const rotated = candidate.rotation === 90 || candidate.rotation === 270;
    const width = rotated ? building.size.height : building.size.width;
    const height = rotated ? building.size.width : building.size.height;
    if (candidate.x < 0 || candidate.y < 0 || candidate.x + width > this.width || candidate.y + height > this.height) {
      throw new Error("Move would exceed the plan grid.");
    }
    for (let y = candidate.y; y < candidate.y + height; y += 1) {
      for (let x = candidate.x; x < candidate.x + width; x += 1) {
        if (this.terrain.getAt(x, y) === "water") throw new Error("Move would place the building on water.");
        if (this.isRoadCell(x, y)) throw new Error("Move would overlap a road.");
      }
    }
    this.recordHistory();
    this.placements = this.placements.withReplaced(placement.id, candidate);
    return true;
  }

  setName(name) {
    const normalized = String(name).trim();
    this.name = normalized || "Untitled Plan";
  }

  resizeGrid(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width !== height || ![40, 64, 72].includes(width)) {
      throw new RangeError("Grid size must be 40, 64, or 72 cells.");
    }
    for (const placement of this.placements.getAll()) {
      const building = this.database.getById(placement.catalogItemId);
      const rotated = placement.rotation === 90 || placement.rotation === 270;
      const placementWidth = rotated ? building.size.height : building.size.width;
      const placementHeight = rotated ? building.size.width : building.size.height;
      if (placement.x + placementWidth > width || placement.y + placementHeight > height) {
        throw new Error("Grid resize would exclude an existing building.");
      }
    }
    if (this.terrain.toCells().some((cell) => cell.x >= width || cell.y >= height) || this.roads.getAll().some((road) => road.x >= width || road.y >= height)) {
      throw new Error("Grid resize would exclude terrain or roads.");
    }
    if (!this.districts.withinBounds(width, height)) throw new Error("Grid resize would exclude a district.");
    if (!this.notes.withinBounds(width, height)) throw new Error("Grid resize would exclude a note.");
    this.recordHistory();
    this.width = width;
    this.height = height;
    this.selectedPlacementId = null;
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
    return { database: this.database, width: this.width, height: this.height, terrain: this.terrain, roads: this.roads.getAll(), districts: this.districts.getAll(), notes: this.notes.getAll(), placements: this.placements.getAll(), layers: this.layers, optimization: this.optimizationReport, selectedPlacementId: this.selectedPlacementId };
  }

  setLayerVisibility(name, visible) { this.layers = this.layers.withVisibility(name, visible); }

  get statistics() {
    return calculatePlanStatistics({ width: this.width, height: this.height, terrain: this.terrain, roads: this.roads.getAll(), placements: this.placements.getAll() }, this.database);
  }

  get optimizationReport() {
    return analyzePlan({ width: this.width, height: this.height, placements: this.placements.getAll(), roads: this.roads.getAll() }, this.database);
  }

  toDocument() {
    return {
      schemaVersion: 1,
      id: this.id,
      name: this.name,
      updatedAt: new Date().toISOString(),
      grid: { width: this.width, height: this.height, cellSize: 1 },
      terrain: this.terrain.toCells(),
      roads: this.roads.getAll(),
      districts: this.districts.getAll(),
      placements: this.placements.getAll(),
      notes: this.notes.getAll(),
      layers: this.layers.toJSON(),
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
      roads: Array.isArray(document.roads) ? document.roads : [],
      districts: Array.isArray(document.districts) ? document.districts : [],
      notes: Array.isArray(document.notes) ? document.notes : [],
      layers: document.layers && typeof document.layers === "object" ? document.layers : {},
    });
  }

  findPlacementAt(x, y) {
    return this.placements.getAll().find((placement) => {
      const building = this.database.getById(placement.catalogItemId);
      return x >= placement.x && x < placement.x + building.size.width && y >= placement.y && y < placement.y + building.size.height;
    }) ?? null;
  }

  isBuildingCell(x, y) {
    return this.placements.getAll().some((placement) => {
      const building = this.database.getById(placement.catalogItemId);
      if (!building) return false;
      const rotated = placement.rotation === 90 || placement.rotation === 270;
      const width = rotated ? building.size.height : building.size.width;
      const height = rotated ? building.size.width : building.size.height;
      return x >= placement.x && x < placement.x + width && y >= placement.y && y < placement.y + height;
    });
  }

  isRoadCell(x, y) {
    return this.roads.getAll().some((road) => this.roadSegmentCells(road).some((cell) => cell.x === x && cell.y === y));
  }

  isRoadSegmentBlockedByBuilding(segment) {
    return this.roadSegmentCells(segment).some((cell) => this.isBuildingCell(cell.x, cell.y));
  }

  roadSegmentCells(segment) {
    return segment.direction === "horizontal"
      ? [{ x: segment.x, y: segment.y }, { x: segment.x + 1, y: segment.y }]
      : [{ x: segment.x, y: segment.y }, { x: segment.x, y: segment.y + 1 }];
  }

  recordHistory() {
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
  }

  snapshot() {
    return { placements: this.placements.getAll(), terrain: this.terrain.toCells(), roads: this.roads.getAll(), districts: this.districts.getAll(), notes: this.notes.getAll(), layers: this.layers.toJSON(), width: this.width, height: this.height, nextPlacementNumber: this.nextPlacementNumber };
  }

  restore(snapshot) {
    this.placements = new PlacementStore(this.database, snapshot.placements);
    this.terrain = Terrain.fromCells(snapshot.terrain);
    this.roads = new RoadNetwork(snapshot.roads);
    this.districts = new DistrictStore(snapshot.districts ?? []);
    this.notes = new NoteStore(snapshot.notes ?? []);
    this.layers = new LayerState(snapshot.layers ?? {});
    this.width = snapshot.width;
    this.height = snapshot.height;
    this.nextPlacementNumber = snapshot.nextPlacementNumber;
    this.selectedPlacementId = null;
  }

  assertInBounds(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.width || y >= this.height) {
      throw new RangeError("Terrain cell must be within the plan grid.");
    }
  }
}
