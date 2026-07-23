import { serviceDefinition } from "./ServiceEffects.js";

/** Renders details and planning controls for the currently selected catalog item. */
export class Inspector {
  constructor(root) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Inspector requires a root element.");
    }

    this.root = root;
    this.showEmpty();
  }

  showEmpty() {
    this.root.replaceChildren(
      emptyState(),
    );
  }

  showStatistics(statistics, optimization = { issues: [] }) {
    const content = document.createElement("section");
    content.className = "inspector-properties";
    const title = document.createElement("h2");
    title.className = "inspector-name";
    title.textContent = "Plan statistics";
    const details = document.createElement("dl");
    details.className = "inspector-property-list";
    details.append(
      property("Buildings", String(statistics.buildingCount)),
      property("Occupied cells", String(statistics.occupiedCells)),
      property("Road segments", String(statistics.roadSegmentCount)),
      property("Terrain cells", String(statistics.terrainCellCount)),
      property("Grid area", String(statistics.gridArea)),
    );
    content.append(title, details);
    const diagnostics = document.createElement("section");
    diagnostics.className = "inspector-diagnostics";
    const diagnosticsTitle = document.createElement("h3");
    diagnosticsTitle.textContent = "Planning warnings";
    diagnostics.append(diagnosticsTitle);
    if (optimization.issues.length === 0) {
      const clear = document.createElement("p");
      clear.textContent = "No current warnings.";
      diagnostics.append(clear);
    } else {
      const list = document.createElement("ul");
      for (const item of optimization.issues) {
        const entry = document.createElement("li");
        entry.className = `diagnostic-${item.severity}`;
        entry.textContent = item.message;
        list.append(entry);
      }
      diagnostics.append(list);
    }
    content.append(diagnostics);
    this.root.replaceChildren(content);
  }

  showBuilding(building) {
    const content = document.createElement("section");
    content.className = "inspector-properties";

    const name = document.createElement("h2");
    name.className = "inspector-name";
    name.textContent = building.name;

    const category = document.createElement("p");
    category.className = "inspector-category";
    category.textContent = building.category;

    const properties = document.createElement("dl");
    properties.className = "inspector-property-list";
    properties.append(
      property("Catalog ID", building.id),
      property("Footprint", `${building.size.width} × ${building.size.height}`),
      property("Levels", String(serviceDefinition(building.id)?.maxLevel ?? Math.max(1, building.levels.length))),
      property("Confidence", building.confidence ?? "unverified"),
    );

    if (building.placementRule) properties.append(property("Placement note", building.placementRule));
    if (building.source?.reference) {
      properties.append(property("Source", building.source.reference));
    }

    content.append(name, category, properties);
    this.root.replaceChildren(content);
  }

  showPlacement(building, placement, onDelete, onRotate, onMove, onLevelChange = () => {}, onRadiusChange = () => {}, diagnostics = []) {
    this.showBuilding(building);
    const content = this.root.firstElementChild;
    const properties = content.querySelector(".inspector-property-list");
    properties.append(property("Cell", `${placement.x}, ${placement.y}`));
    properties.append(property("Rotation", `${placement.rotation}°`));
    if (diagnostics.length > 0) {
      const warningSection = document.createElement("section");
      warningSection.className = "inspector-diagnostics";
      const warningTitle = document.createElement("h3");
      warningTitle.textContent = "Placement warnings";
      const warningList = document.createElement("ul");
      for (const diagnostic of diagnostics) {
        const item = document.createElement("li");
        item.className = `diagnostic-${diagnostic.severity}`;
        item.textContent = diagnostic.message;
        warningList.append(item);
      }
      warningSection.append(warningTitle, warningList);
      content.append(warningSection);
    }
    const definition = serviceDefinition(building.id);
    if (definition && definition.maxLevel > 1) {
      const levelLabel = document.createElement("label");
      levelLabel.className = "inspector-control-label";
      levelLabel.textContent = "Building level";
      const level = document.createElement("select");
      level.className = "inspector-level";
      for (let value = 1; value <= definition.maxLevel; value += 1) {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = `Level ${value}`;
        level.append(option);
      }
      level.value = String(placement.level ?? 1);
      level.addEventListener("change", () => onLevelChange(Number(level.value)));
      levelLabel.append(level);
      content.append(levelLabel);
    }
    if (definition?.mode === "local") {
      const radiusLabel = document.createElement("label");
      radiusLabel.className = "inspector-control-label";
      radiusLabel.textContent = "Planning radius (tiles)";
      const radius = document.createElement("input");
      radius.type = "number";
      radius.min = "0";
      radius.step = "0.5";
      radius.placeholder = `Default ${definition.defaultRadius}`;
      radius.value = Number.isFinite(placement.coverageRadius) ? String(placement.coverageRadius) : "";
      radius.title = "Exact game radius is not publicly documented; enter a planning assumption to preview coverage.";
      radius.addEventListener("change", () => onRadiusChange(radius.value.trim() === "" ? null : Number(radius.value)));
      radiusLabel.append(radius);
      content.append(radiusLabel);
      const note = document.createElement("p");
      note.className = "inspector-help";
      note.textContent = `The reference does not publish an exact tile radius. The overlay uses a ${definition.defaultRadius}-tile planning estimate; enter a different radius to override it.`;
      content.append(note);
    } else if (definition) {
      const note = document.createElement("p");
      note.className = "inspector-help";
      note.textContent = `${definition.label} is ${definition.mode === "network" ? "distributed through the connected network" : "a citywide capacity"}; it does not use a local tile radius.`;
      content.append(note);
    }
    const rotate = document.createElement("button");
    rotate.type = "button";
    rotate.className = "inspector-delete";
    rotate.textContent = "Rotate 90°";
    rotate.addEventListener("click", onRotate);
    const moveControls = document.createElement("div");
    moveControls.className = "inspector-move-controls";
    for (const [label, deltaX, deltaY] of [["↑", 0, -1], ["←", -1, 0], ["→", 1, 0], ["↓", 0, 1]]) {
      const move = document.createElement("button");
      move.type = "button";
      move.className = "inspector-move";
      move.textContent = label;
      move.setAttribute("aria-label", `Move ${label}`);
      move.addEventListener("click", () => onMove(deltaX, deltaY));
      moveControls.append(move);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "inspector-delete";
    remove.textContent = "Delete placement";
    remove.addEventListener("click", onDelete);
    content.append(moveControls, rotate, remove);
  }
}

function emptyState() {
  const state = document.createElement("div");
  state.className = "inspector-empty-state";

  const icon = document.createElement("span");
  icon.className = "inspector-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "◇";

  const title = document.createElement("strong");
  title.textContent = "No selection";

  const description = document.createElement("p");
  description.textContent = "Select a building in the catalog to view its properties.";

  state.append(icon, title, description);
  return state;
}

function property(name, value) {
  const row = document.createElement("div");
  row.className = "inspector-property";

  const label = document.createElement("dt");
  label.textContent = name;

  const detail = document.createElement("dd");
  detail.textContent = value;

  row.append(label, detail);
  return row;
}
