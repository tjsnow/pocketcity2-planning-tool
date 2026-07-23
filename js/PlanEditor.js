import { PlacementStore } from "./Placement.js";
import { Terrain } from "./Terrain.js";
import { RoadNetwork } from "./Roads.js";
import { calculatePlanStatistics } from "./Statistics.js";
import { DistrictStore } from "./Districts.js";
import { NoteStore } from "./PlanningTools.js";
import { analyzePlan } from "./Optimization.js";
import { LayerState } from "./Layers.js";
import { serviceDefinition } from "./ServiceEffects.js";

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
    this.nextPlacementNumber = nextPlacementNumberFor(placements);
    this.undoStack = [];
    this.redoStack = [];
    this.terrainStrokeActive = false;
    this.terrainStrokeHistoryRecorded = false;
    this.roadStrokeActive = false;
    this.roadStrokeHistoryRecorded = false;
    this.bulldozerStrokeActive = false;
    this.bulldozerStrokeHistoryRecorded = false;
    this.placementMoveStrokeActive = false;
    this.placementMoveHistoryRecorded = false;
    this.catalogPaintStrokeActive = false;
    this.catalogPaintStrokeHistoryRecorded = false;
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
      if (!this.bulldozerStrokeActive || !this.bulldozerStrokeHistoryRecorded) {
        this.recordHistory();
        this.bulldozerStrokeHistoryRecorded = true;
      }
      this.placements = this.placements.without(placement.id);
      this.selectedPlacementId = null;
      return true;
    }
    const matches = this.roads.getAll().filter((road) => this.roadSegmentCells(road).some((cell) => cell.x === x && cell.y === y));
    if (matches.length === 0) return false;
    if (!this.bulldozerStrokeActive || !this.bulldozerStrokeHistoryRecorded) {
      this.recordHistory();
      this.bulldozerStrokeHistoryRecorded = true;
    }
    for (const road of matches) this.roads = this.roads.withoutSegment(road);
    return true;
  }

  beginBulldozerStroke() {
    this.bulldozerStrokeActive = true;
    this.bulldozerStrokeHistoryRecorded = false;
  }

  endBulldozerStroke() {
    this.bulldozerStrokeActive = false;
    this.bulldozerStrokeHistoryRecorded = false;
  }

  beginPlacementMoveStroke() {
    this.placementMoveStrokeActive = true;
    this.placementMoveHistoryRecorded = false;
  }

  endPlacementMoveStroke() {
    this.placementMoveStrokeActive = false;
    this.placementMoveHistoryRecorded = false;
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
      } else {
        this.removePlacementsIntersectingCells(this.roadSegmentCells(segment));
        this.removeMatchingRoadSegment(segment);
        this.roads = this.roads.withSegment(segment);
      }
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
    this.removePlacementsIntersectingCells(this.roadSegmentCells(segment));
    this.removeMatchingRoadSegment(segment);
    this.roads = this.roads.withSegment(segment);
    this.selectedPlacementId = null;
    return null;
  }

  addRoadAt(x, y) {
    this.assertInBounds(x, y);
    const segment = { x, y, direction: this.activeRoadDirection, roadType: this.activeRoadType };
    if (!this.roadStrokeActive || !this.roadStrokeHistoryRecorded) {
      this.recordHistory();
      this.roadStrokeHistoryRecorded = true;
    }
    this.removePlacementsIntersectingCells(this.roadSegmentCells(segment));
    this.removeMatchingRoadSegment(segment);
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
      level: 1,
      layer: "structures",
    };
    this.recordCatalogPaintHistory();
    this.removePlacementsIntersectingCells(this.placementCells(placement, building));
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

  setSelectedLevel(level) {
    const placement = this.selectedPlacement;
    if (!placement) return false;
    const definition = serviceDefinition(placement.catalogItemId);
    const maxLevel = definition?.maxLevel ?? 1;
    if (!Number.isInteger(level) || level < 1 || level > maxLevel) throw new RangeError(`Level must be between 1 and ${maxLevel}.`);
    if ((placement.level ?? 1) === level) return false;
    this.recordHistory();
    this.placements = this.placements.withReplaced(placement.id, { ...placement, level });
    return true;
  }

  setSelectedCoverageRadius(radius) {
    const placement = this.selectedPlacement;
    if (!placement) return false;
    if (radius !== null && (!Number.isFinite(radius) || radius < 0)) throw new RangeError("Coverage radius must be blank or a non-negative number.");
    const normalized = radius === null ? undefined : radius;
    if (normalized === placement.coverageRadius) return false;
    this.recordHistory();
    const next = { ...placement };
    if (normalized === undefined) delete next.coverageRadius;
    else next.coverageRadius = normalized;
    this.placements = this.placements.withReplaced(placement.id, next);
    return true;
  }

  getAreaContents(bounds) {
    const area = normalizeAreaBounds(bounds, this.width, this.height);
    const placements = this.placements.getAll().filter((placement) => {
      const building = this.database.getById(placement.catalogItemId);
      const rotated = placement.rotation === 90 || placement.rotation === 270;
      const width = rotated ? building.size.height : building.size.width;
      const height = rotated ? building.size.width : building.size.height;
      return rectanglesOverlap(area, { x: placement.x, y: placement.y, width, height });
    });
    const roads = this.roads.getAll().filter((road) => this.roadSegmentCells(road).some((cell) => cell.x >= area.x && cell.x < area.x + area.width && cell.y >= area.y && cell.y < area.y + area.height));
    return { area, placements, roads };
  }

  deleteArea(bounds) {
    const contents = this.getAreaContents(bounds);
    if (contents.placements.length === 0 && contents.roads.length === 0) return contents;
    this.recordHistory();
    for (const placement of contents.placements) this.placements = this.placements.without(placement.id);
    for (const road of contents.roads) this.roads = this.roads.withoutSegment(road);
    this.selectedPlacementId = null;
    return contents;
  }

  clearPlan() {
    const hasContent = this.placements.getAll().length > 0 || this.terrain.toCells().length > 0 || this.roads.getAll().length > 0 || this.districts.getAll().length > 0 || this.notes.getAll().length > 0;
    if (!hasContent) return false;
    this.recordHistory();
    this.placements = new PlacementStore(this.database, []);
    this.terrain = Terrain.fromCells([]);
    this.roads = new RoadNetwork([]);
    this.districts = new DistrictStore([]);
    this.notes = new NoteStore([]);
    this.selectedPlacementId = null;
    this.nextPlacementNumber = 1;
    return true;
  }

  paintTerrainArea(bounds, terrainId) {
    if (typeof terrainId !== "string" || terrainId.trim().length === 0) throw new TypeError("Terrain ID must be a non-empty string.");
    const area = normalizeAreaBounds(bounds, this.width, this.height);
    const removeBuildings = terrainId === "water" || terrainId === "mountains";
    const placements = removeBuildings ? this.getAreaContents(area).placements : [];
    const cells = new Map(this.terrain.toCells().map((cell) => [`${cell.x},${cell.y}`, cell.terrainId]));
    let changed = placements.length > 0;
    for (let y = area.y; y < area.y + area.height; y += 1) {
      for (let x = area.x; x < area.x + area.width; x += 1) {
        const key = `${x},${y}`;
        if (terrainId === "unassigned") { if (cells.delete(key)) changed = true; }
        else if (cells.get(key) !== terrainId) { cells.set(key, terrainId); changed = true; }
      }
    }
    if (!changed) return { area, terrainId, removedBuildings: [] };
    this.recordHistory();
    this.terrain = Terrain.fromCells([...cells.entries()].map(([key, id]) => { const [x, y] = key.split(",").map(Number); return { x, y, terrainId: id }; }));
    for (const placement of placements) this.placements = this.placements.without(placement.id);
    this.selectedPlacementId = null;
    return { area, terrainId, removedBuildings: placements };
  }

  paintZoneArea(bounds, catalogItemId) {
    const zone = this.database.getById(catalogItemId);
    if (!zone || zone.category !== "zone") throw new Error("A zone catalog item is required.");
    const area = normalizeAreaBounds(bounds, this.width, this.height);
    const placements = [];
    let skippedCount = 0;
    for (let y = area.y; y < area.y + area.height; y += 1) {
      for (let x = area.x; x < area.x + area.width; x += 1) {
        if (this.terrain.getAt(x, y) !== "unassigned" || this.isRoadCell(x, y) || this.findPlacementAt(x, y)) { skippedCount += 1; continue; }
        placements.push({ id: `placement-${this.nextPlacementNumber + placements.length}`, catalogItemId, x, y, rotation: 0 });
      }
    }
    if (placements.length === 0) return { area, placements: [], skippedCount };
    this.recordCatalogPaintHistory();
    for (const placement of placements) this.placements = this.placements.withPlaced(placement);
    this.nextPlacementNumber += placements.length;
    this.selectedPlacementId = null;
    return { area, placements, skippedCount };
  }

  paintNatureArea(bounds, catalogItemId, shape = "rectangle") {
    const nature = this.database.getById(catalogItemId);
    if (!nature || nature.category !== "nature" || !nature.terrainId) throw new Error("A nature catalog item is required.");
    if (shape !== "rectangle" && shape !== "circle") throw new RangeError("Nature area shape must be rectangle or circle.");
    const area = normalizeAreaBounds(bounds, this.width, this.height);
    const cells = new Map(this.terrain.toCells().map((cell) => [`${cell.x},${cell.y}`, cell.terrainId]));
    let paintedCount = 0;
    let skippedCount = 0;
    for (let y = area.y; y < area.y + area.height; y += 1) {
      for (let x = area.x; x < area.x + area.width; x += 1) {
        if (shape === "circle" && !cellIsInsideCircle(x, y, bounds)) continue;
        if (this.isRoadCell(x, y) || this.findPlacementAt(x, y)) { skippedCount += 1; continue; }
        const cellKey = `${x},${y}`;
        if (cells.get(cellKey) === nature.terrainId) continue;
        cells.set(cellKey, nature.terrainId);
        paintedCount += 1;
      }
    }
    if (paintedCount === 0) return { area, terrainId: nature.terrainId, paintedCount, skippedCount };
    this.recordCatalogPaintHistory();
    this.terrain = Terrain.fromCells([...cells.entries()].map(([cellKey, terrainId]) => {
      const [x, y] = cellKey.split(",").map(Number);
      return { x, y, terrainId };
    }));
    this.selectedPlacementId = null;
    return { area, terrainId: nature.terrainId, paintedCount, skippedCount };
  }

  beginCatalogPaintStroke() {
    this.catalogPaintStrokeActive = true;
    this.catalogPaintStrokeHistoryRecorded = false;
  }

  endCatalogPaintStroke() {
    this.catalogPaintStrokeActive = false;
    this.catalogPaintStrokeHistoryRecorded = false;
  }

  recordCatalogPaintHistory() {
    if (this.catalogPaintStrokeActive && this.catalogPaintStrokeHistoryRecorded) return;
    this.recordHistory();
    if (this.catalogPaintStrokeActive) this.catalogPaintStrokeHistoryRecorded = true;
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
    if (deltaX === 0 && deltaY === 0) return false;
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
    if (!this.placementMoveStrokeActive || !this.placementMoveHistoryRecorded) {
      this.recordHistory();
      this.placementMoveHistoryRecorded = true;
    }
    this.placements = this.placements.withReplaced(placement.id, candidate);
    return true;
  }

  moveSelectedTo(x, y) {
    const placement = this.selectedPlacement;
    if (!placement) return false;
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new TypeError("Move target must use whole cells.");
    return this.moveSelected(x - placement.x, y - placement.y);
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

  generateCity(seed = Date.now()) {
    if (![40, 64, 72].includes(this.width) || this.width !== this.height) throw new Error("City generation requires a supported square grid.");
    const random = seededRandom(seed);
    const terrainCells = [];
    const waterCells = new Set();
    const riverX = Math.floor(this.width * (0.25 + random() * 0.5));
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const river = Math.abs(x - riverX - Math.sin(y / 7) * 2) <= 1;
        const terrainId = river ? "water" : (Math.abs(x - riverX - Math.sin(y / 7) * 2) === 2 ? "sand" : (random() < 0.035 ? "soil" : "grass"));
        terrainCells.push({ x, y, terrainId });
        if (terrainId === "water") waterCells.add(`${x},${y}`);
      }
    }
    for (let i = 0; i < Math.floor(this.width * 1.4); i += 1) {
      const x = Math.floor(random() * this.width);
      const y = Math.floor(random() * this.height);
      const cell = terrainCells[y * this.width + x];
      if (!waterCells.has(`${x},${y}`)) cell.terrainId = random() < 0.65 ? "planted-tree" : (random() < 0.5 ? "wild-tree" : "mountains");
    }
    const roads = [];
    const roadKeys = new Set();
    const addRoad = (segment) => { const key = `${segment.x},${segment.y},${segment.direction}`; if (!roadKeys.has(key)) { roadKeys.add(key); roads.push(segment); } };
    for (let y = 6; y < this.height - 1; y += 8) for (let x = 0; x < this.width - 1; x += 1) addRoad({ x, y, direction: "horizontal", roadType: "road" });
    for (let x = 6; x < this.width - 1; x += 8) for (let y = 0; y < this.height - 1; y += 1) addRoad({ x, y, direction: "vertical", roadType: "high-density" });
    const roadCells = new Set(roads.flatMap((road) => this.roadSegmentCells(road).map((cell) => `${cell.x},${cell.y}`)));
    const buildingIds = ["cottage", "townhouse", "apartment-building", "corner-shop", "office-building", "shopping-center", "warehouse", "factory", "school", "clinic", "small-park", "museum", "bus-depot", "subway-station"].filter((id) => this.database.getById(id));
    const placements = [];
    const occupied = new Set();
    let attempts = 0;
    while (placements.length < Math.max(18, Math.floor(this.width * 0.7)) && attempts < 2500 && buildingIds.length > 0) {
      attempts += 1;
      const buildingId = buildingIds[Math.floor(random() * buildingIds.length)];
      const building = this.database.getById(buildingId);
      const x = Math.floor(random() * Math.max(1, this.width - building.size.width));
      const y = Math.floor(random() * Math.max(1, this.height - building.size.height));
      let valid = true;
      for (let yy = y; yy < y + building.size.height; yy += 1) for (let xx = x; xx < x + building.size.width; xx += 1) if (waterCells.has(`${xx},${yy}`) || roadCells.has(`${xx},${yy}`) || occupied.has(`${xx},${yy}`)) valid = false;
      if (!valid) continue;
      for (let yy = y; yy < y + building.size.height; yy += 1) for (let xx = x; xx < x + building.size.width; xx += 1) occupied.add(`${xx},${yy}`);
      placements.push({ id: `placement-${placements.length + 1}`, catalogItemId: buildingId, x, y, rotation: 0 });
    }
    this.recordHistory();
    this.terrain = Terrain.fromCells(terrainCells);
    this.roads = new RoadNetwork(roads);
    this.placements = new PlacementStore(this.database, placements);
    this.selectedPlacementId = null;
    this.nextPlacementNumber = placements.length + 1;
    return { terrainCount: terrainCells.length, roadCount: roads.length, buildingCount: placements.length };
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

  placementCells(placement, building = this.database.getById(placement.catalogItemId)) {
    const rotated = placement.rotation === 90 || placement.rotation === 270;
    const width = rotated ? building.size.height : building.size.width;
    const height = rotated ? building.size.width : building.size.height;
    const cells = [];
    for (let y = placement.y; y < placement.y + height; y += 1) {
      for (let x = placement.x; x < placement.x + width; x += 1) cells.push({ x, y });
    }
    return cells;
  }

  removePlacementsIntersectingCells(cells) {
    const targets = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    const intersecting = this.placements.getAll().filter((placement) =>
      this.placementCells(placement).some((cell) => targets.has(`${cell.x},${cell.y}`)),
    );
    for (const placement of intersecting) this.placements = this.placements.without(placement.id);
    if (intersecting.some((placement) => placement.id === this.selectedPlacementId)) this.selectedPlacementId = null;
    return intersecting;
  }

  removeMatchingRoadSegment(segment) {
    const existing = this.roads.getAll().filter((road) =>
      road.x === segment.x && road.y === segment.y && road.direction === segment.direction,
    );
    for (const road of existing) this.roads = this.roads.withoutSegment(road);
    return existing;
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

function normalizeAreaBounds(bounds, width, height) {
  const x = Math.max(0, Math.min(width - 1, Math.floor(bounds.x)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(bounds.y)));
  const maxX = Math.max(x, Math.min(width - 1, Math.floor(bounds.x + bounds.width - 1)));
  const maxY = Math.max(y, Math.min(height - 1, Math.floor(bounds.y + bounds.height - 1)));
  return { x, y, width: maxX - x + 1, height: maxY - y + 1 };
}

function cellIsInsideCircle(x, y, bounds) {
  const centerX = Number.isFinite(bounds.centerX) ? bounds.centerX : bounds.x + (bounds.width - 1) / 2;
  const centerY = Number.isFinite(bounds.centerY) ? bounds.centerY : bounds.y + (bounds.height - 1) / 2;
  const radius = Number.isFinite(bounds.radius) ? bounds.radius : Math.max(0, Math.min(bounds.width, bounds.height) - 1) / 2;
  return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2;
}

function rectanglesOverlap(left, right) {
  return left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
}

function nextPlacementNumberFor(placements) {
  return placements.reduce((next, placement) => {
    const match = /^placement-(\d+)$/.exec(placement.id);
    return match ? Math.max(next, Number(match[1]) + 1) : next;
  }, 1);
}

function seededRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}
