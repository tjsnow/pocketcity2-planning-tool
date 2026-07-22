/** Renders read-only details for the currently selected catalog item. */
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
      property("Levels", String(building.levels.length)),
      property("Confidence", building.confidence ?? "unverified"),
    );

    if (building.source?.reference) {
      properties.append(property("Source", building.source.reference));
    }

    content.append(name, category, properties);
    this.root.replaceChildren(content);
  }

  showPlacement(building, placement, onDelete, onRotate, onMove) {
    this.showBuilding(building);
    const content = this.root.firstElementChild;
    const properties = content.querySelector(".inspector-property-list");
    properties.append(property("Cell", `${placement.x}, ${placement.y}`));
    properties.append(property("Rotation", `${placement.rotation}°`));
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
