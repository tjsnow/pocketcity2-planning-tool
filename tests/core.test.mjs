import test from "node:test";
import assert from "node:assert/strict";
import { PlanEditor } from "../js/PlanEditor.js";
import { analyzePlan } from "../js/Optimization.js";
import { parsePlan } from "../js/SaveManager.js";
import { LayerState } from "../js/Layers.js";
import { PluginRegistry } from "../js/PluginAPI.js";

const database = { getById: (id) => id === "park" ? { id, name: "Park", category: "recreation", size: { width: 1, height: 1 } } : null };

test("roads can cross water but not buildings", () => {
  const editor = new PlanEditor(database, { terrain: [{ x: 1, y: 1, terrainId: "water" }] });
  editor.selectRoadTool();
  editor.clickCell(1, 1);
  assert.equal(editor.roads.getAll().length, 1);
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

test("persistence rejects malformed JSON", () => {
  assert.throws(() => parsePlan("{bad"), /valid JSON/);
});

test("layers and plugins validate core extension contracts", () => {
  assert.equal(new LayerState().withVisibility("grid", false).isVisible("grid"), false);
  const plugins = new PluginRegistry();
  plugins.registerCatalogItem("test", { id: "fixture", name: "Fixture" });
  assert.equal(plugins.getCatalogItems().length, 1);
});
