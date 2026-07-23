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

  items() { return [...this.database.getAll(), ...this.terrainItems.filter((item) => item.terrainId === "unassigned")]; }
}

function buildingCard(building, isSelected, onSelect) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "building-card";
  card.setAttribute("aria-pressed", String(isSelected));
  if (isSelected) card.classList.add("is-selected");
  card.addEventListener("click", onSelect);
  if (!building.terrainId && !building.roadType && building.category !== "zone") {
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
  if (building.roadType) {
    icon.classList.add("building-card-road-sprite", `road-sprite-${building.roadType}`);
    icon.setAttribute("title", `${building.name} icon`);
  } else if (building.category === "zone" && zoneSprite(building.id)) {
    applySprite(icon, "images/original-zone-icon-atlas.png", zoneSprite(building.id), 4);
  } else if (building.terrainId && terrainSprite(building.terrainId)) {
    applySprite(icon, "images/original-terrain-icon-atlas.png", terrainSprite(building.terrainId), 3);
  } else if (building.id) {
    const extension = extensionSprite(building.id);
    applySprite(icon, extension ? "images/original-catalog-extension-atlas.png" : "images/original-catalog-icon-atlas.png", extension ?? citySprite(building.id, building.category), 4);
  } else {
    icon.textContent = building.roadIcon ?? defaultIconCatalog.get(building.id, building.category);
  }
  icon.setAttribute("aria-hidden", "true");
  card.prepend(icon);

  const detail = document.createElement("span");
  detail.className = "building-card-detail";
  detail.textContent = building.category === "zone" ? `${building.category} · variable area` : `${building.category} · ${building.size.width} × ${building.size.height}`;

  const confidence = document.createElement("span");
  confidence.className = "building-card-confidence";
  confidence.textContent = building.confidence ?? "unverified";

  card.append(name, detail, confidence);
  return card;
}

function applySprite(element, atlas, [column, row], columns) {
  element.classList.add("building-card-sprite");
  element.style.backgroundImage = `url("${atlas}")`;
  element.style.backgroundSize = `${columns * 24}px ${columns * 24}px`;
  element.style.backgroundPosition = `-${column * 24}px -${row * 24}px`;
  element.setAttribute("aria-label", "Catalog icon");
}

function terrainSprite(id) { return { "planted-tree": [0, 0], water: [1, 0], sand: [2, 0], soil: [0, 1], grass: [1, 1], canal: [2, 1], "wild-tree": [0, 2], mountains: [1, 2], "palm-tree": [2, 2] }[id]; }
function zoneSprite(id) { return { "residential-zone": [0, 0], "commercial-zone": [1, 0], "industrial-zone": [2, 0] }[id]; }
function extensionSprite(id) { return { "water-tower": [0, 0], "sewage-lagoon": [1, 0], "solar-power-plant": [2, 0], "wind-power-plant": [3, 0], "fire-department": [0, 1], "police-station": [1, 1], "elementary-school": [2, 1], library: [3, 1], "bus-stop": [0, 2], "light-rail-stop": [1, 2], "commuter-train-station": [2, 2], bridge: [3, 2], "moderate-hotel": [0, 3], museum: [1, 3], lighthouse: [2, 3], "mega-stadium": [3, 3] }[id]; }
function citySprite(id, category) { return { cottage: [0, 0], townhouse: [0, 0], "apartment-building": [1, 0], "high-rise-apartments": [1, 0], "corner-shop": [2, 0], "office-building": [3, 0], "shopping-center": [2, 0], hotel: [3, 0], warehouse: [0, 1], factory: [0, 1], "community-center": [1, 1], school: [2, 1], hospital: [3, 1], "fire-department": [0, 2], "fire-station": [0, 2], "police-station": [1, 2], "small-park": [2, 2], "sports-stadium": [3, 2], aquarium: [3, 2], "power-plant": [0, 3], "water-pump": [1, 3], airport: [2, 3], "zone-residential": [3, 3], "zone-commercial": [3, 3], "zone-industrial": [3, 3], "zone-office": [3, 3], "zone-mixed-use": [3, 3], "zone-leisure": [3, 3], "zone-waterfront": [3, 3], "zone-rural": [3, 3], "zone-high-density-residential": [3, 3], "zone-high-density-commercial": [3, 3] }[id] ?? ({ zone: [3, 3], "water-sewage": [1, 3], power: [0, 3], service: [0, 2], transportation: [2, 3], recreation: [2, 2], education: [2, 1], resource: [0, 1], financial: [3, 0], landmark: [1, 1], unique: [3, 1], "mega-project": [3, 3] }[category] ?? [0, 0]); }

function message(text) {
  const element = document.createElement("p");
  element.className = "building-browser-message";
  element.textContent = text;
  return element;
}
