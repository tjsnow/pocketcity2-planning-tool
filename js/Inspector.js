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
    );

    content.append(name, category, properties);
    this.root.replaceChildren(content);
  }

  showPlacement(building, placement, onDelete) {
    this.showBuilding(building);
    const content = this.root.firstElementChild;
    const properties = content.querySelector(".inspector-property-list");
    properties.append(property("Cell", `${placement.x}, ${placement.y}`));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "inspector-delete";
    remove.textContent = "Delete placement";
    remove.addEventListener("click", onDelete);
    content.append(remove);
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
