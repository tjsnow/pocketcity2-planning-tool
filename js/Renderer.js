import { Camera } from "./Camera.js";
import { Grid } from "./Grid.js";
import { OverlayRegistry } from "./Overlays.js";
import { defaultIconCatalog } from "./IconCatalog.js";
import { Radius } from "./Radius.js";
import { coverageRadiusFor, effectColor, serviceDefinition, supportsEffectType } from "./ServiceEffects.js";

const BACKGROUND_COLOR = "#171b20";

/**
 * Isolated Canvas rendering engine.
 * It owns Canvas sizing, the render loop, and viewport navigation only.
 */
export class Renderer {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Renderer requires an HTML canvas element.");
    }

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D rendering is unavailable in this browser.");
    }

    this.canvas = canvas;
    this.context = context;
    this.camera = new Camera();
    this.grid = new Grid();
    this.overlays = new OverlayRegistry();
    this.cssWidth = 0;
    this.cssHeight = 0;
    this.devicePixelRatio = 1;
    this.animationFrameId = null;
    this.activePan = null;
    this.panMode = false;
    this.scene = null;
    this.onCanvasClick = null;
    this.onCanvasPointerDown = null;
    this.onCanvasPointerDrag = null;
    this.onCanvasPointerUp = null;
    this.activePrimaryPointerId = null;
    this.didDrag = false;
    this.onPointerMove = null;
    this.onViewportChange = null;
    this.areaDeletePreview = null;
    this.effectType = "health";
    this.roadIconAtlas = new Image();
    this.roadIconAtlas.addEventListener("load", () => this.requestRender());
    this.roadIconAtlas.src = "./images/original-road-icon-atlas.png";
    this.cityIconAtlas = new Image();
    this.cityIconAtlas.addEventListener("load", () => this.requestRender());
    this.cityIconAtlas.src = "./images/original-catalog-icon-atlas.png";
    this.extensionIconAtlas = new Image();
    this.extensionIconAtlas.addEventListener("load", () => this.requestRender());
    this.extensionIconAtlas.src = "./images/original-catalog-extension-atlas.png";
    this.zoneIconAtlas = new Image();
    this.zoneIconAtlas.addEventListener("load", () => this.requestRender());
    this.zoneIconAtlas.src = "./images/original-zone-icon-atlas.png";
    this.terrainIconAtlas = new Image();
    this.terrainIconAtlas.addEventListener("load", () => this.requestRender());
    this.terrainIconAtlas.src = "./images/original-terrain-icon-atlas.png";

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.bindNavigationEvents();
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

    const dimensionsChanged =
      width !== this.cssWidth ||
      height !== this.cssHeight ||
      pixelRatio !== this.devicePixelRatio;

    if (!dimensionsChanged) return;

    this.cssWidth = width;
    this.cssHeight = height;
    this.devicePixelRatio = pixelRatio;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.camera.setViewport(width, height);
    this.requestRender();
  }

  requestRender() {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.render();
    });
  }

  render() {
    this.context.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.context.clearRect(0, 0, this.cssWidth, this.cssHeight);
    this.drawBackground();
    this.context.save();
    this.clipToGrid();
    if (this.layerVisible("terrain")) this.drawTerrain();
    if (this.layerVisible("grid")) this.grid.draw(this.context, this.camera, this.cssWidth, this.cssHeight);
    if (this.layerVisible("roads")) this.drawRoads();
    if (this.layerVisible("effects")) this.drawEffects();
    if (this.layerVisible("buildings")) this.drawPlacements();
    if (this.layerVisible("warnings")) this.drawOptimizationWarnings();
    this.drawAreaDeletePreview();
    this.context.restore();
    this.overlays.draw(this.context, this.camera, this.cssWidth, this.cssHeight);
  }

  addOverlay(overlay) {
    this.overlays.add(overlay);
    this.requestRender();
  }

  removeOverlay(id) {
    const removed = this.overlays.remove(id);
    if (removed) this.requestRender();
    return removed;
  }

  setScene(scene) {
    this.scene = scene;
    if (scene?.width && scene?.height) this.grid.setBounds(scene.width, scene.height);
    this.requestRender();
  }

  layerVisible(name) { return !this.scene?.layers || this.scene.layers.isVisible(name); }

  clipToGrid() {
    if (!this.scene?.width || !this.scene?.height) return;
    const topLeft = this.camera.worldToScreen({ x: 0, y: this.scene.height * this.grid.cellSize });
    const bottomRight = this.camera.worldToScreen({ x: this.scene.width * this.grid.cellSize, y: 0 });
    this.context.beginPath();
    this.context.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    this.context.clip();
  }

  setCanvasClickHandler(handler) {
    this.onCanvasClick = handler;
  }

  setCanvasDragHandlers({ onPointerDown, onDrag, onPointerUp } = {}) {
    this.onCanvasPointerDown = onPointerDown;
    this.onCanvasPointerDrag = onDrag;
    this.onCanvasPointerUp = onPointerUp;
  }

  setPointerMoveHandler(handler) {
    this.onPointerMove = handler;
  }

  setViewportChangeHandler(handler) {
    this.onViewportChange = handler;
  }

  setAreaDeletePreview(bounds) {
    this.areaDeletePreview = bounds ? { ...bounds } : null;
    this.requestRender();
  }

  setEffectType(effectType) {
    this.effectType = String(effectType || "health");
    this.requestRender();
  }

  setPanMode(enabled) {
    this.panMode = Boolean(enabled);
    if (!this.panMode) this.endPan();
    this.canvas.style.cursor = this.panMode ? "grab" : "default";
  }

  zoomBy(factor) {
    this.camera.zoomAt({ x: this.cssWidth / 2, y: this.cssHeight / 2 }, this.camera.zoom * factor);
    this.requestRender();
    this.onViewportChange?.(this.camera.zoom);
  }

  drawBackground() {
    this.context.fillStyle = BACKGROUND_COLOR;
    this.context.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  drawAreaDeletePreview() {
    const bounds = this.areaDeletePreview;
    if (!bounds) return;
    const topLeft = this.camera.worldToScreen({ x: bounds.x * this.grid.cellSize, y: (bounds.y + bounds.height) * this.grid.cellSize });
    const bottomRight = this.camera.worldToScreen({ x: (bounds.x + bounds.width) * this.grid.cellSize, y: bounds.y * this.grid.cellSize });
    this.context.save();
    this.context.fillStyle = "rgba(224, 67, 67, 0.22)";
    this.context.strokeStyle = "#ff5f62";
    this.context.lineWidth = 2;
    this.context.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    this.context.strokeRect(topLeft.x + 1, topLeft.y + 1, bottomRight.x - topLeft.x - 2, bottomRight.y - topLeft.y - 2);
    this.context.restore();
  }

  drawPlacements() {
    if (!this.scene) return;
    const { database, placements, selectedPlacementId } = this.scene;
    for (const placement of placements) {
      const building = database.getById(placement.catalogItemId);
      if (!building) continue;
      const rotated = placement.rotation === 90 || placement.rotation === 270;
      const width = (rotated ? building.size.height : building.size.width) * this.grid.cellSize * this.camera.zoom;
      const footprintHeight = rotated ? building.size.width : building.size.height;
      const height = footprintHeight * this.grid.cellSize * this.camera.zoom;
      const topLeft = this.camera.worldToScreen({ x: placement.x * this.grid.cellSize, y: (placement.y + footprintHeight) * this.grid.cellSize });
      this.context.fillStyle = placement.id === selectedPlacementId ? "#4e94d9" : "#3971b3";
      this.context.fillRect(topLeft.x + 2, topLeft.y + 2, Math.max(0, width - 4), Math.max(0, height - 4));
      const isZone = building.category === "zone";
      const extension = EXTENSION_ICON_ATLAS_COORDINATES[building.id];
      const iconAtlas = isZone ? this.zoneIconAtlas : extension ? this.extensionIconAtlas : this.cityIconAtlas;
      if (isZone) drawZoneIcon(this.context, iconAtlas, building.id, topLeft.x + 2, topLeft.y + 2, Math.max(0, width - 4), Math.max(0, height - 4));
      else if (extension) drawExtensionIcon(this.context, iconAtlas, building.id, topLeft.x + 2, topLeft.y + 2, Math.max(0, width - 4), Math.max(0, height - 4));
      else drawCityIcon(this.context, iconAtlas, building.id, topLeft.x + 2, topLeft.y + 2, Math.max(0, width - 4), Math.max(0, height - 4));
      this.context.strokeStyle = "#b9d8f5";
      this.context.strokeRect(topLeft.x + 2.5, topLeft.y + 2.5, Math.max(0, width - 5), Math.max(0, height - 5));
      if (!(isZone ? hasZoneIcon(this.zoneIconAtlas, building.id) : extension ? hasExtensionIcon(this.extensionIconAtlas, building.id) : hasCityIcon(this.cityIconAtlas, building.id))) {
        this.context.fillStyle = "#edf3f8";
        this.context.font = `${Math.max(10, Math.min(18, this.grid.cellSize * this.camera.zoom * 0.45))}px sans-serif`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.fillText(defaultIconCatalog.get(building.id, building.category), topLeft.x + width / 2, topLeft.y + height / 2);
      }
    }
  }

  drawEffects() {
    if (!this.scene) return;
    const color = effectColor(this.effectType);
    const cellSize = this.grid.cellSize * this.camera.zoom;
    for (const placement of this.scene.placements) {
      const building = this.scene.database.getById(placement.catalogItemId);
      const definition = building ? serviceDefinition(building.id) : null;
      if (!building || !definition || !supportsEffectType(building.id, this.effectType)) continue;
      const rotated = placement.rotation === 90 || placement.rotation === 270;
      const footprintWidth = rotated ? building.size.height : building.size.width;
      const footprintHeight = rotated ? building.size.width : building.size.height;
      const radius = coverageRadiusFor(building.id, placement);
      this.context.save();
      if (radius === null) {
        const topLeft = this.camera.worldToScreen({ x: placement.x * this.grid.cellSize, y: (placement.y + footprintHeight) * this.grid.cellSize });
        this.context.setLineDash([5, 4]);
        this.context.strokeStyle = "#f0c766";
        this.context.lineWidth = 2;
        this.context.strokeRect(topLeft.x + 3, topLeft.y + 3, footprintWidth * cellSize - 6, footprintHeight * cellSize - 6);
        this.context.restore();
        continue;
      }
      const origin = { x: placement.x + Math.floor(footprintWidth / 2), y: placement.y + Math.floor(footprintHeight / 2) };
      const cells = new Radius({ radius, metric: "euclidean" }).cellsAround(origin);
      this.context.fillStyle = `${color}38`;
      for (const cell of cells) {
        if (cell.x < 0 || cell.y < 0 || cell.x >= this.scene.width || cell.y >= this.scene.height) continue;
        const topLeft = this.camera.worldToScreen({ x: cell.x * this.grid.cellSize, y: (cell.y + 1) * this.grid.cellSize });
        this.context.fillRect(topLeft.x, topLeft.y, cellSize, cellSize);
      }
      this.context.strokeStyle = `${color}aa`;
      this.context.lineWidth = 1.5;
      this.context.setLineDash([4, 4]);
      const topLeft = this.camera.worldToScreen({ x: (origin.x - radius) * this.grid.cellSize, y: (origin.y + radius) * this.grid.cellSize });
      this.context.strokeRect(topLeft.x, topLeft.y, (radius * 2 + 1) * cellSize, (radius * 2 + 1) * cellSize);
      this.context.restore();
    }
  }

  drawOptimizationWarnings() {
    if (!this.scene?.optimization?.issues?.length) return;
    const placementsById = new Map(this.scene.placements.map((placement) => [placement.id, placement]));
    this.context.save();
    this.context.fillStyle = "#ed5b5b";
    this.context.strokeStyle = "#260f12";
    this.context.lineWidth = 2;
    for (const warning of this.scene.optimization.issues) {
      const placement = placementsById.get(warning.subjectId);
      if (!placement || warning.severity !== "error") continue;
      const point = this.camera.worldToScreen({ x: (placement.x + 0.5) * this.grid.cellSize, y: (placement.y + 0.5) * this.grid.cellSize });
      this.context.beginPath();
      this.context.arc(point.x, point.y, Math.max(4, this.grid.cellSize * this.camera.zoom * 0.13), 0, Math.PI * 2);
      this.context.fill();
      this.context.stroke();
    }
    this.context.restore();
  }

  drawRoads() {
    if (!this.scene?.roads) return;
    const cellSize = this.grid.cellSize * this.camera.zoom;
    const nodes = new Map();
    this.context.save();
    this.context.fillStyle = "#4b5058";
    for (const road of this.scene.roads) {
      this.context.fillStyle = roadSurfaceColor(road.roadType);
      const cells = road.direction === "vertical" ? [{ x: road.x, y: road.y }, { x: road.x, y: road.y + 1 }] : [{ x: road.x, y: road.y }, { x: road.x + 1, y: road.y }];
      for (const cell of cells) {
        const topLeft = this.camera.worldToScreen({ x: cell.x * this.grid.cellSize, y: (cell.y + 1) * this.grid.cellSize });
        this.context.fillRect(topLeft.x, topLeft.y, cellSize, cellSize);
        drawRoadIcon(this.context, this.roadIconAtlas, road.roadType, topLeft.x, topLeft.y, cellSize);
      }
    }
    this.context.lineWidth = Math.max(4, cellSize * 0.22);
    this.context.lineCap = "round";
    for (const road of this.scene.roads) {
      this.context.strokeStyle = roadLineColor(road.roadType);
      const start = { x: road.x, y: road.y };
      const end = road.direction === "horizontal" ? { x: road.x + 1, y: road.y } : { x: road.x, y: road.y + 1 };
      addRoadNode(nodes, start, road.direction === "horizontal" ? ["left", "right"] : ["up", "down"]);
      addRoadNode(nodes, end, road.direction === "horizontal" ? ["left", "right"] : ["up", "down"]);
      const startScreen = this.camera.worldToScreen({ x: (start.x + 0.5) * this.grid.cellSize, y: (start.y + 0.5) * this.grid.cellSize });
      const endScreen = this.camera.worldToScreen({ x: (end.x + 0.5) * this.grid.cellSize, y: (end.y + 0.5) * this.grid.cellSize });
      this.context.beginPath();
      this.context.moveTo(startScreen.x, startScreen.y);
      this.context.lineTo(endScreen.x, endScreen.y);
      this.context.stroke();
    }
    this.context.fillStyle = "#d5b277";
    for (const node of nodes.values()) {
      if (node.directions.size < 3) continue;
      const point = this.camera.worldToScreen({ x: (node.x + 0.5) * this.grid.cellSize, y: (node.y + 0.5) * this.grid.cellSize });
      this.context.beginPath();
      this.context.arc(point.x, point.y, Math.max(2, cellSize * 0.12), 0, Math.PI * 2);
      this.context.fill();
    }
    this.context.restore();
  }

  drawTerrain() {
    if (!this.scene?.terrain) return;
    for (const cell of this.scene.terrain.toCells()) {
      const topLeft = this.camera.worldToScreen({ x: cell.x * this.grid.cellSize, y: (cell.y + 1) * this.grid.cellSize });
      const size = this.grid.cellSize * this.camera.zoom;
      this.context.fillStyle = terrainColor(cell.terrainId);
      this.context.fillRect(topLeft.x, topLeft.y, size, size);
      drawTerrainIcon(this.context, this.terrainIconAtlas, cell.terrainId, topLeft.x, topLeft.y, size);
    }
  }

  destroy() {
    this.resizeObserver.disconnect();
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
  }

  bindNavigationEvents() {
    this.canvas.addEventListener("pointerdown", (event) => { this.beginPan(event); this.beginPrimaryPointer(event); });
    this.canvas.addEventListener("pointermove", (event) => this.pan(event));
    this.canvas.addEventListener("pointermove", (event) => { this.reportPointer(event); this.dragPrimaryPointer(event); });
    this.canvas.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    this.canvas.addEventListener("pointercancel", (event) => { this.endPan(); this.endPrimaryPointer(event); });
    this.canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
  }

  reportPointer(event) {
    const screenPoint = this.eventToCanvasPoint(event);
    this.onPointerMove?.(this.camera.screenToWorld(screenPoint), screenPoint);
  }

  beginPrimaryPointer(event) {
    if (event.button !== 0 || event.shiftKey || event.pointerType === "touch" || this.panMode) return;
    this.activePrimaryPointerId = event.pointerId;
    this.didDrag = false;
    this.onCanvasPointerDown?.(this.camera.screenToWorld(this.eventToCanvasPoint(event)));
  }

  dragPrimaryPointer(event) {
    if (event.pointerId !== this.activePrimaryPointerId || this.activePan) return;
    this.didDrag = true;
    this.onCanvasPointerDrag?.(this.camera.screenToWorld(this.eventToCanvasPoint(event)));
  }

  endPrimaryPointer(event) {
    if (event.pointerId !== this.activePrimaryPointerId) return;
    this.onCanvasPointerUp?.();
    this.activePrimaryPointerId = null;
  }

  beginPan(event) {
    const canPan = event.pointerType === "touch" || event.button === 1 || event.shiftKey || (this.panMode && event.button === 0);
    if (!canPan) return;

    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.activePan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    this.canvas.style.cursor = "grabbing";
  }

  pan(event) {
    if (!this.activePan || event.pointerId !== this.activePan.pointerId) return;

    const deltaX = event.clientX - this.activePan.x;
    const deltaY = event.clientY - this.activePan.y;
    this.activePan = { ...this.activePan, x: event.clientX, y: event.clientY };
    this.camera.panByScreen(deltaX, deltaY);
    this.requestRender();
    this.onViewportChange?.(this.camera.zoom);
  }

  endPan() {
    this.activePan = null;
    this.canvas.style.cursor = this.panMode ? "grab" : "default";
  }

  handlePointerUp(event) {
    const wasPanning = this.activePan?.pointerId === event.pointerId;
    this.endPan();
    const wasDragging = this.didDrag;
    this.endPrimaryPointer(event);
    this.didDrag = false;
    if (!wasPanning && !wasDragging && event.button === 0 && !event.shiftKey) {
      this.onCanvasClick?.(this.camera.screenToWorld(this.eventToCanvasPoint(event)));
    }
  }

  zoom(event) {
    event.preventDefault();
    const pointer = this.eventToCanvasPoint(event);
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    this.camera.zoomAt(pointer, this.camera.zoom * zoomFactor);
    this.requestRender();
    this.onViewportChange?.(this.camera.zoom);
  }

  eventToCanvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
}

function addRoadNode(nodes, point, directions) {
  const key = `${point.x},${point.y}`;
  const node = nodes.get(key) ?? { ...point, directions: new Set() };
  for (const direction of directions) node.directions.add(direction);
  nodes.set(key, node);
}

function roadSurfaceColor(type) {
  return { road: "#4b5058", "high-density": "#626872", dirt: "#73583d", pedestrian: "#4d765f", boardwalk: "#806443", "light-rail": "#385b87", "train-rail": "#4a4e59", "high-rail": "#654e86", subway: "#2f6f72" }[type] ?? "#4b5058";
}

function roadLineColor(type) {
  return { road: "#c7a36a", "high-density": "#e0e4eb", dirt: "#c49a62", pedestrian: "#b4e0bd", boardwalk: "#e2b477", "light-rail": "#79b8ff", "train-rail": "#d0d4dc", "high-rail": "#d7a9ff", subway: "#8be2df" }[type] ?? "#c7a36a";
}

const ROAD_ICON_ATLAS_COORDINATES = {
  road: [0, 0], "high-density": [1, 0], dirt: [2, 0], pedestrian: [0, 1], boardwalk: [1, 1], "light-rail": [2, 1], "train-rail": [0, 2], "high-rail": [1, 2], subway: [2, 2],
};

const TERRAIN_ICON_ATLAS_COORDINATES = { "planted-tree": [0, 0], water: [1, 0], sand: [2, 0], soil: [0, 1], grass: [1, 1], canal: [2, 1], "wild-tree": [0, 2], mountains: [1, 2], "palm-tree": [2, 2] };
const CITY_ICON_ATLAS_COORDINATES = { cottage: [0, 0], townhouse: [0, 0], "apartment-building": [1, 0], "high-rise-apartments": [1, 0], "corner-shop": [2, 0], "office-building": [3, 0], "shopping-center": [2, 0], hotel: [3, 0], warehouse: [0, 1], factory: [0, 1], "community-center": [1, 1], school: [2, 1], hospital: [3, 1], "fire-department": [0, 2], "fire-station": [0, 2], "police-station": [1, 2], "small-park": [2, 2], "sports-stadium": [3, 2], aquarium: [3, 2], "power-plant": [0, 3], "water-pump": [1, 3], airport: [2, 3], "zone-residential": [3, 3], "zone-commercial": [3, 3], "zone-industrial": [3, 3], "zone-office": [3, 3], "zone-mixed-use": [3, 3], "zone-leisure": [3, 3], "zone-waterfront": [3, 3], "zone-rural": [3, 3], "zone-high-density-residential": [3, 3], "zone-high-density-commercial": [3, 3] };
const EXTENSION_ICON_ATLAS_COORDINATES = { "water-tower": [0, 0], "sewage-lagoon": [1, 0], "solar-power-plant": [2, 0], "wind-power-plant": [3, 0], "fire-department": [0, 1], "police-station": [1, 1], "elementary-school": [2, 1], library: [3, 1], "bus-stop": [0, 2], "light-rail-stop": [1, 2], "commuter-train-station": [2, 2], bridge: [3, 2], "moderate-hotel": [0, 3], museum: [1, 3], lighthouse: [2, 3], "mega-stadium": [3, 3] };
const ZONE_ICON_ATLAS_COORDINATES = { "zone-residential": [0, 0], "zone-commercial": [1, 0], "zone-industrial": [2, 0], "zone-office": [3, 0], "zone-mixed-use": [0, 1], "zone-leisure": [1, 1], "zone-waterfront": [2, 1], "zone-rural": [3, 1], "zone-high-density-residential": [0, 2], "zone-high-density-commercial": [1, 2] };

function drawRoadIcon(context, atlas, roadType, x, y, size) {
  if (!atlas.complete || atlas.naturalWidth === 0) return;
  const [column, row] = ROAD_ICON_ATLAS_COORDINATES[roadType] ?? ROAD_ICON_ATLAS_COORDINATES.road;
  const sourceSize = atlas.naturalWidth / 3;
  context.save();
  context.globalAlpha = 0.72;
  context.drawImage(atlas, column * sourceSize, row * sourceSize, sourceSize, sourceSize, x, y, size, size);
  context.restore();
}

function drawTerrainIcon(context, atlas, terrainId, x, y, size) {
  const coordinates = TERRAIN_ICON_ATLAS_COORDINATES[terrainId];
  if (!coordinates || !atlas.complete || atlas.naturalWidth === 0) return;
  drawAtlasTile(context, atlas, coordinates, x, y, size, 3, 0.8);
}

function drawCityIcon(context, atlas, buildingId, x, y, width, height) {
  if (!atlas.complete || atlas.naturalWidth === 0) return;
  const coordinates = CITY_ICON_ATLAS_COORDINATES[buildingId] ?? [0, 0];
  drawAtlasTile(context, atlas, coordinates, x, y, Math.min(width, height), 4, 0.78, width, height);
}

function drawExtensionIcon(context, atlas, buildingId, x, y, width, height) {
  if (!atlas.complete || atlas.naturalWidth === 0) return;
  drawAtlasTile(context, atlas, EXTENSION_ICON_ATLAS_COORDINATES[buildingId], x, y, Math.min(width, height), 4, 0.78, width, height);
}

function drawZoneIcon(context, atlas, buildingId, x, y, width, height) {
  if (!atlas.complete || atlas.naturalWidth === 0) return;
  drawAtlasTile(context, atlas, ZONE_ICON_ATLAS_COORDINATES[buildingId] ?? [0, 0], x, y, Math.min(width, height), 4, 0.84, width, height);
}

function drawAtlasTile(context, atlas, [column, row], x, y, size, columns, alpha, width = size, height = size) {
  const sourceSize = atlas.naturalWidth / columns;
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(atlas, column * sourceSize, row * sourceSize, sourceSize, sourceSize, x, y, width, height);
  context.restore();
}

function hasCityIcon(atlas, buildingId) { return Boolean(atlas.complete && atlas.naturalWidth && CITY_ICON_ATLAS_COORDINATES[buildingId]); }
function hasExtensionIcon(atlas, buildingId) { return Boolean(atlas.complete && atlas.naturalWidth && EXTENSION_ICON_ATLAS_COORDINATES[buildingId]); }
function hasZoneIcon(atlas, buildingId) { return Boolean(atlas.complete && atlas.naturalWidth && ZONE_ICON_ATLAS_COORDINATES[buildingId]); }

function terrainColor(type) { return { water: "#1c557e", sand: "#c9ad70", soil: "#78543d", grass: "#2f6041", canal: "#287da0", "planted-tree": "#4e8a4d", "wild-tree": "#245c35", mountains: "#6f7780", "palm-tree": "#4c8b63" }[type] ?? "#2f6041"; }
