import { defaultIconCatalog } from "./IconCatalog.js";

/** Renders a searchable, non-selecting browser for a validated building catalog. */
export class BuildingBrowser {
  constructor(root, database, onSelect = () => {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Building browser requires a root element.");
    }

    this.root = root;
    this.database = database;
    this.terrainItems = [
      ["Planted Tree", "planted-tree"], ["Water", "water"], ["Sand", "sand"], ["Soil", "soil"], ["Grass", "grass"], ["Canal", "canal"], ["Wild Tree", "wild-tree"], ["Mountains", "mountains"], ["Palm Tree", "palm-tree"],
    ].map(([name, terrainId]) => ({ id: `terrain-${terrainId}`, name, category: "terrain", terrainId, size: { width: 1, height: 1 }, confidence: "community-reported" }));
    this.terrainItems.push(
      { id: "terrain-erase", name: "Erase terrain", category: "terrain", terrainId: "unassigned", size: { width: 1, height: 1 }, confidence: "built-in" },
    );
    this.roadItems = [
      ["Street", "road", "▬"], ["High Density", "high-density", "═"], ["Dirt", "dirt", "▒"], ["Pedestrian", "pedestrian", "◇"], ["Boardwalk", "boardwalk", "≋"], ["Light Rail", "light-rail", "╫"], ["Train Rail", "train-rail", "║"], ["High Rail", "high-rail", "╬"], ["Subway", "subway", "▾"],
    ].map(([name, roadType, icon]) => ({ id: `road-${roadType}`, name, category: "roads", roadType, roadIcon: icon, size: { width: 1, height: 1 }, confidence: roadType === "road" ? "built-in" : "community-reported" }));
    this.onSelect = onSelect;
    this.selectedBuildingId = null;
    this.searchInput = root.querySelector("#building-search");
    this.categorySelect = root.querySelector("#building-category");
    this.results = root.querySelector("#building-results");
    this.closeButton = root.querySelector("[data-building-browser-close]");
    this.closeButton?.addEventListener("click", () => this.close());
    this.categoryButtons = document.querySelectorAll("[data-building-category]");
    this.categoryButtons.forEach((button) => button.addEventListener("click", () => {
      if (this.root.classList.contains("is-open") && this.activeOpener === button) {
        this.close();
        return;
      }
      this.activeOpener = button;
      this.categorySelect.value = button.dataset.buildingCategory;
      const openerBounds = button.getBoundingClientRect();
      root.style.left = `${openerBounds.right + 8}px`;
      root.style.top = `${openerBounds.top}px`;
      root.classList.add("is-open");
      this.render();
      this.searchInput.focus();
    }));
    root.addEventListener("click", (event) => { if (event.target === root) root.classList.remove("is-open"); });
    this.populateCategories();
    this.searchInput.addEventListener("input", () => this.render());
    this.categorySelect.addEventListener("change", () => this.render());
    root.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); this.close(); } });
    this.render();
  }

  close() {
    this.root.classList.remove("is-open");
    this.root.style.left = "";
    this.root.style.top = "";
    this.activeOpener?.focus();
  }

  populateCategories() {
    const categories = [...new Set(this.items().map((building) => building.category))].sort();
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
    const buildings = this.items().filter((building) => {
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

  items() { return [...this.database.getAll(), ...this.terrainItems, ...this.roadItems]; }
}

function buildingCard(building, isSelected, onSelect) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "building-card";
  card.setAttribute("aria-pressed", String(isSelected));
  if (isSelected) card.classList.add("is-selected");
  card.addEventListener("click", onSelect);
  if (!building.terrainId && !building.roadType) {
    card.draggable = true;
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/x-pocket-city-building", building.id);
      event.dataTransfer.effectAllowed = "copy";
    });
  }

  const name = document.createElement("span");
  name.className = "building-card-name";
  name.textContent = building.name;

  const icon = document.createElement("span");
  icon.className = "building-card-icon";
  icon.textContent = building.roadIcon ?? defaultIconCatalog.get(building.id, building.category);
  icon.setAttribute("aria-hidden", "true");
  card.prepend(icon);

  const detail = document.createElement("span");
  detail.className = "building-card-detail";
  detail.textContent = `${building.category} · ${building.size.width} × ${building.size.height}`;

  const confidence = document.createElement("span");
  confidence.className = "building-card-confidence";
  confidence.textContent = building.confidence ?? "unverified";

  card.append(name, detail, confidence);
  return card;
}

function message(text) {
  const element = document.createElement("p");
  element.className = "building-browser-message";
  element.textContent = text;
  return element;
}
