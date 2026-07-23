import test from "node:test";
import assert from "node:assert/strict";
import { PlanEditor } from "../js/PlanEditor.js";
import { analyzePlan } from "../js/Optimization.js";
import { parsePlan, planDownloadFileName } from "../js/SaveManager.js";
import { LayerState } from "../js/Layers.js";
import { PluginRegistry } from "../js/PluginAPI.js";
import { coverageRadiusFor, getEffectTypes, requiredUtilitiesFor, supportsEffectType } from "../js/ServiceEffects.js";
import { adjacentRoadEndConnections } from "../js/Roads.js";
import { utilityWarningType } from "../js/Renderer.js";

const database = { getById: (id) => id === "park" ? { id, name: "Park", category: "recreation", size: { width: 1, height: 1 } } : null };

test("roads can cross water", () => {
  const editor = new PlanEditor(database, { terrain: [{ x: 1, y: 1, terrainId: "water" }] });
  editor.selectRoadTool();
  editor.clickCell(1, 1);
  assert.equal(editor.roads.getAll().length, 1);
});

test("placing a building replaces an overlapping building in one undo step", () => {
  const editor = new PlanEditor(database, { placements: [{ id: "original", catalogItemId: "park", x: 4, y: 4, rotation: 0, layer: "structures" }] });
  editor.selectBuilding("park");
  editor.clickCell(4, 4);
  assert.equal(editor.placements.getAll().length, 1);
  assert.notEqual(editor.placements.getAll()[0].id, "original");
  editor.undo();
  assert.equal(editor.placements.getAll()[0].id, "original");
});

test("large power plant placement does not reuse an existing placement ID", () => {
  const buildings = new Map([
    ["park", { id: "park", name: "Park", category: "recreation", size: { width: 1, height: 1 } }],
    ["large-power-plant", { id: "large-power-plant", name: "Large Power Plant", category: "power", size: { width: 2, height: 2 } }],
  ]);
  const placementDatabase = { getById: (id) => buildings.get(id) ?? null };
  const editor = new PlanEditor(placementDatabase, {
    placements: [{ id: "placement-2", catalogItemId: "park", x: 1, y: 1, rotation: 0 }],
  });
  editor.selectBuilding("large-power-plant");
  const placed = editor.placeAt(10, 10);
  assert.equal(placed.id, "placement-3");
  assert.equal(editor.placements.getAll().length, 2);
});

test("nature area fill skips buildings and roads", () => {
  const items = new Map([
    ["park", { id: "park", name: "Park", category: "recreation", size: { width: 1, height: 1 } }],
    ["water", { id: "water", name: "Water", category: "nature", terrainId: "water", size: { width: 1, height: 1 } }],
  ]);
  const natureDatabase = { getById: (id) => items.get(id) ?? null };
  const editor = new PlanEditor(natureDatabase, {
    placements: [{ id: "placement-1", catalogItemId: "park", x: 1, y: 1, rotation: 0 }],
    roads: [{ x: 2, y: 2, direction: "horizontal", roadType: "road" }],
  });
  const result = editor.paintNatureArea({ x: 0, y: 0, width: 4, height: 4 }, "water");
  assert.equal(editor.placements.getAll().length, 1);
  assert.equal(editor.roads.getAll().length, 1);
  assert.equal(editor.terrain.getAt(1, 1), "unassigned");
  assert.equal(editor.terrain.getAt(2, 2), "unassigned");
  assert.equal(editor.terrain.getAt(0, 0), "water");
  assert.equal(result.skippedCount, 3);
});

test("nature circular area fill paints only cells inside the selected radius", () => {
  const nature = { id: "grass", name: "Grass", category: "nature", terrainId: "grass", size: { width: 1, height: 1 } };
  const natureDatabase = { getById: (id) => id === "grass" ? nature : null };
  const editor = new PlanEditor(natureDatabase);
  const result = editor.paintNatureArea({ x: 3, y: 3, width: 3, height: 3, centerX: 4, centerY: 4, radius: 1 }, "grass", "circle");
  assert.equal(result.paintedCount, 5);
  assert.equal(editor.terrain.getAt(4, 4), "grass");
  assert.equal(editor.terrain.getAt(3, 3), "unassigned");
});

test("zone area fill skips nature, buildings, and roads", () => {
  const items = new Map([
    ["residential-zone", { id: "residential-zone", name: "Residential Zone", category: "zone", size: { width: 1, height: 1 } }],
    ["park", { id: "park", name: "Park", category: "recreation", size: { width: 1, height: 1 } }],
  ]);
  const zoneDatabase = { getById: (id) => items.get(id) ?? null };
  const editor = new PlanEditor(zoneDatabase, {
    terrain: [{ x: 0, y: 0, terrainId: "grass" }],
    placements: [{ id: "park-1", catalogItemId: "park", x: 1, y: 0, rotation: 0 }],
    roads: [{ x: 2, y: 0, direction: "vertical", roadType: "road" }],
  });
  const result = editor.paintZoneArea({ x: 0, y: 0, width: 4, height: 1 }, "residential-zone");
  assert.equal(result.placements.length, 1);
  assert.equal(result.placements[0].x, 3);
  assert.equal(result.skippedCount, 3);
});

test("nature paint drag groups multiple cells into one undo step", () => {
  const nature = { id: "grass", name: "Grass", category: "nature", terrainId: "grass", size: { width: 1, height: 1 } };
  const natureDatabase = { getById: (id) => id === "grass" ? nature : null };
  const editor = new PlanEditor(natureDatabase);
  editor.beginCatalogPaintStroke();
  editor.paintNatureArea({ x: 1, y: 1, width: 1, height: 1 }, "grass");
  editor.paintNatureArea({ x: 2, y: 1, width: 1, height: 1 }, "grass");
  editor.endCatalogPaintStroke();
  assert.equal(editor.terrain.getAt(1, 1), "grass");
  assert.equal(editor.terrain.getAt(2, 1), "grass");
  editor.undo();
  assert.equal(editor.terrain.getAt(1, 1), "unassigned");
  assert.equal(editor.terrain.getAt(2, 1), "unassigned");
});

test("building paint drag groups multiple placements into one undo step", () => {
  const editor = new PlanEditor(database);
  editor.selectBuilding("park");
  editor.beginCatalogPaintStroke();
  editor.placeAt(1, 1);
  editor.placeAt(2, 1);
  editor.endCatalogPaintStroke();
  assert.equal(editor.placements.getAll().length, 2);
  editor.undo();
  assert.equal(editor.placements.getAll().length, 0);
});

test("placing a road replaces an intersecting building in one undo step", () => {
  const editor = new PlanEditor(database, { placements: [{ id: "original", catalogItemId: "park", x: 4, y: 4, rotation: 0, layer: "structures" }] });
  editor.selectRoad("horizontal");
  editor.clickCell(4, 4);
  assert.equal(editor.placements.getAll().length, 0);
  assert.equal(editor.roads.getAll().length, 1);
  editor.undo();
  assert.equal(editor.placements.getAll()[0].id, "original");
  assert.equal(editor.roads.getAll().length, 0);
});

test("placing a road replaces the road at the same position", () => {
  const editor = new PlanEditor(database, { roads: [{ x: 4, y: 4, direction: "horizontal", roadType: "dirt" }] });
  editor.selectRoadTool("high-density");
  editor.clickCell(4, 4);
  assert.deepEqual(editor.roads.getAll(), [{ x: 4, y: 4, direction: "horizontal", roadType: "high-density" }]);
  editor.undo();
  assert.deepEqual(editor.roads.getAll(), [{ x: 4, y: 4, direction: "horizontal", roadType: "dirt" }]);
});

test("perpendicular road types can intersect at the same anchor", () => {
  const editor = new PlanEditor(database, { roads: [{ x: 4, y: 4, direction: "horizontal", roadType: "dirt" }] });
  editor.selectRoad("vertical");
  editor.activeRoadType = "high-density";
  editor.clickCell(4, 4);
  assert.deepEqual(editor.roads.getAll(), [
    { x: 4, y: 4, direction: "horizontal", roadType: "dirt" },
    { x: 4, y: 4, direction: "vertical", roadType: "high-density" },
  ]);
});

test("a road loop can close with perpendicular segments at its final corner", () => {
  const editor = new PlanEditor(database, {
    roads: [
      { x: 1, y: 1, direction: "horizontal", roadType: "high-density" },
      { x: 2, y: 1, direction: "vertical", roadType: "high-density" },
      { x: 1, y: 2, direction: "horizontal", roadType: "high-density" },
    ],
  });
  editor.selectRoad("vertical");
  editor.activeRoadType = "high-density";
  editor.clickCell(1, 1);
  assert.equal(editor.roads.getAll().length, 4);
  assert.ok(editor.roads.getAll().some((road) => road.x === 1 && road.y === 1 && road.direction === "horizontal"));
  assert.ok(editor.roads.getAll().some((road) => road.x === 1 && road.y === 1 && road.direction === "vertical"));
});

test("road endpoints in adjacent squares connect automatically", () => {
  const connections = adjacentRoadEndConnections([
    { x: 1, y: 1, direction: "horizontal", roadType: "dirt" },
    { x: 3, y: 1, direction: "horizontal", roadType: "high-density" },
  ]);
  assert.equal(connections.length, 1);
  assert.deepEqual({ x: connections[0].from.x, y: connections[0].from.y }, { x: 2, y: 1 });
  assert.deepEqual({ x: connections[0].to.x, y: connections[0].to.y }, { x: 3, y: 1 });
});

test("a road segment does not connect its own adjacent endpoints twice", () => {
  assert.deepEqual(adjacentRoadEndConnections([
    { x: 1, y: 1, direction: "horizontal", roadType: "road" },
  ]), []);
});

test("parallel roads only auto-connect at exposed chain ends", () => {
  const connections = adjacentRoadEndConnections([
    { x: 1, y: 1, direction: "horizontal", roadType: "road" },
    { x: 2, y: 1, direction: "horizontal", roadType: "road" },
    { x: 1, y: 2, direction: "horizontal", roadType: "high-density" },
    { x: 2, y: 2, direction: "horizontal", roadType: "high-density" },
  ]);
  assert.equal(connections.length, 2);
  assert.ok(connections.every(({ from, to }) => from.x === to.x && (from.x === 1 || from.x === 3)));
});

test("bulldozer removes roads and buildings but not terrain", () => {
  const editor = new PlanEditor(database, { roads: [{ x: 1, y: 1, direction: "horizontal", roadType: "road" }], placements: [{ id: "p1", catalogItemId: "park", x: 4, y: 4, rotation: 0, layer: "structures" }] });
  editor.selectBulldozer();
  editor.clickCell(1, 1);
  editor.clickCell(4, 4);
  assert.equal(editor.roads.getAll().length, 0);
  assert.equal(editor.placements.getAll().length, 0);
});

test("optimization reports missing utility access", () => {
  const report = analyzePlan({ width: 40, height: 40, roads: [], placements: [{ id: "p1", catalogItemId: "park", x: 5, y: 5, rotation: 0 }] }, database);
  assert.ok(report.issues.some((item) => item.code === "no-utility-access"));
});

test("utility coverage warnings map to independent building badges", () => {
  assert.equal(utilityWarningType("no-power-coverage"), "power");
  assert.equal(utilityWarningType("no-water-coverage"), "water");
  assert.equal(utilityWarningType("no-sewage-coverage"), "sewage");
  assert.equal(utilityWarningType("building-overlap"), null);
});

test("persistence rejects malformed JSON", () => {
  assert.throws(() => parsePlan("{bad"), /valid JSON/);
});

test("plan downloads use the timestamped default filename", () => {
  assert.equal(planDownloadFileName(new Date(2026, 6, 22, 9, 5)), "PC2Planner_202607220905.json");
});

test("layers and plugins validate core extension contracts", () => {
  const layers = new LayerState();
  assert.equal(layers.isVisible("effects"), false);
  assert.equal(layers.withVisibility("grid", false).isVisible("grid"), false);
  const plugins = new PluginRegistry();
  plugins.registerCatalogItem("test", { id: "fixture", name: "Fixture" });
  assert.equal(plugins.getCatalogItems().length, 1);
});

test("service effects expose level-aware and user-overridden planning radii", () => {
  assert.ok(getEffectTypes().some((effect) => effect.id === "power"));
  assert.equal(supportsEffectType("biomass-facility", "sewage"), true);
  assert.deepEqual(requiredUtilitiesFor("power-plant"), []);
  assert.deepEqual(requiredUtilitiesFor("water-tower"), []);
  assert.deepEqual(requiredUtilitiesFor("large-water-tower"), []);
  assert.deepEqual(requiredUtilitiesFor("hospital"), ["power", "water", "sewage"]);
  assert.equal(coverageRadiusFor("hospital", { level: 1 }), 6);
  assert.equal(coverageRadiusFor("hospital", { level: 3 }), 10);
  assert.equal(coverageRadiusFor("hospital", { level: 3, coverageRadius: 14 }), 14);
  assert.equal(coverageRadiusFor("landfill"), 60);
});

test("power plants do not require water or sewage coverage", () => {
  const powerPlant = { id: "power-plant", name: "Power Plant", category: "power", size: { width: 1, height: 1 } };
  const powerDatabase = { getById: (id) => id === powerPlant.id ? powerPlant : null };
  const report = analyzePlan({
    width: 40,
    height: 40,
    roads: [{ x: 5, y: 6, direction: "horizontal", roadType: "road" }],
    placements: [{ id: "plant", catalogItemId: "power-plant", x: 5, y: 5, rotation: 0 }],
  }, powerDatabase);
  assert.equal(report.issues.some((issue) => issue.subjectId === "plant" && /^no-(power|water|sewage)-coverage$/.test(issue.code)), false);
});

test("water towers do not require electricity or sewage coverage", () => {
  const waterTower = { id: "water-tower", name: "Water Tower", category: "water-sewage", size: { width: 1, height: 1 } };
  const waterDatabase = { getById: (id) => id === waterTower.id ? waterTower : null };
  const report = analyzePlan({
    width: 40,
    height: 40,
    roads: [{ x: 5, y: 6, direction: "horizontal", roadType: "road" }],
    placements: [{ id: "tower", catalogItemId: "water-tower", x: 5, y: 5, rotation: 0 }],
  }, waterDatabase);
  assert.equal(report.issues.some((issue) => issue.subjectId === "tower" && /^no-(power|water|sewage)-coverage$/.test(issue.code)), false);
});

test("optimization accepts utilities supplied by a connected multi-utility source", () => {
  const buildings = new Map([
    ["home", { id: "home", name: "Home", category: "zone", size: { width: 1, height: 1 } }],
    ["biomass-facility", { id: "biomass-facility", name: "Biomass Facility", category: "power", size: { width: 1, height: 1 } }],
  ]);
  const utilityDatabase = { getById: (id) => buildings.get(id) ?? null };
  const report = analyzePlan({
    width: 40,
    height: 40,
    roads: [{ x: 1, y: 2, direction: "horizontal", roadType: "road" }, { x: 2, y: 2, direction: "horizontal", roadType: "road" }],
    placements: [
      { id: "source", catalogItemId: "biomass-facility", x: 1, y: 1, rotation: 0 },
      { id: "target", catalogItemId: "home", x: 2, y: 1, rotation: 0 },
    ],
  }, utilityDatabase);
  assert.equal(report.issues.some((issue) => issue.subjectId === "target" && /^no-(power|water|sewage)-coverage$/.test(issue.code)), false);
});

test("utilities do not cross disconnected road networks", () => {
  const buildings = new Map([
    ["hospital", { id: "hospital", name: "Hospital", category: "service", size: { width: 1, height: 1 } }],
    ["power-plant", { id: "power-plant", name: "Power Plant", category: "power", size: { width: 1, height: 1 } }],
  ]);
  const utilityDatabase = { getById: (id) => buildings.get(id) ?? null };
  const report = analyzePlan({
    width: 40,
    height: 40,
    roads: [
      { x: 2, y: 3, direction: "horizontal", roadType: "road" },
      { x: 7, y: 3, direction: "horizontal", roadType: "road" },
    ],
    placements: [
      { id: "plant", catalogItemId: "power-plant", x: 2, y: 2, rotation: 0 },
      { id: "hospital", catalogItemId: "hospital", x: 7, y: 2, rotation: 0 },
    ],
  }, utilityDatabase);
  assert.ok(report.issues.some((issue) => issue.subjectId === "hospital" && issue.code === "no-power-coverage"));
});
