/** Renders a searchable, non-selecting browser for a validated building catalog. */
export class BuildingBrowser {
  constructor(root, database, onSelect = () => {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Building browser requires a root element.");
    }

    this.root = root;
    this.database = database;
    this.onSelect = onSelect;
    this.selectedBuildingId = null;
    this.searchInput = root.querySelector("#building-search");
    this.categorySelect = root.querySelector("#building-category");
    this.results = root.querySelector("#building-results");
    this.populateCategories();
    this.searchInput.addEventListener("input", () => this.render());
    this.categorySelect.addEventListener("change", () => this.render());
    this.render();
  }

  populateCategories() {
    const categories = [...new Set(this.database.getAll().map((building) => building.category))].sort();
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      this.categorySelect.append(option);
    }
  }

  render() {
    const searchTerm = this.searchInput.value.trim().toLocaleLowerCase();
    const selectedCategory = this.categorySelect.value;
    const buildings = this.database.getAll().filter((building) => {
      const matchesSearch = building.name.toLocaleLowerCase().includes(searchTerm);
      const matchesCategory = !selectedCategory || building.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    this.results.replaceChildren();
    if (buildings.length === 0) {
      this.results.append(message("No buildings match the current catalog or filters."));
      return;
    }

    for (const building of buildings) {
      this.results.append(buildingCard(building, this.selectedBuildingId === building.id, () => {
        this.selectedBuildingId = building.id;
        this.onSelect(building);
        this.render();
      }));
    }
  }

  showLoadError() {
    this.results.replaceChildren(message("Building catalog is unavailable. Serve the project from a static web server and try again."));
  }
}

function buildingCard(building, isSelected, onSelect) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "building-card";
  card.setAttribute("aria-pressed", String(isSelected));
  if (isSelected) card.classList.add("is-selected");
  card.addEventListener("click", onSelect);

  const name = document.createElement("span");
  name.className = "building-card-name";
  name.textContent = building.name;

  const detail = document.createElement("span");
  detail.className = "building-card-detail";
  detail.textContent = `${building.category} · ${building.size.width} × ${building.size.height}`;

  card.append(name, detail);
  return card;
}

function message(text) {
  const element = document.createElement("p");
  element.className = "building-browser-message";
  element.textContent = text;
  return element;
}
