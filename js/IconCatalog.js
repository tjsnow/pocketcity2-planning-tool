const CATEGORY_ICONS = { recreation: "★", service: "✚", transport: "⇄", terrain: "▧", roads: "↔" };

/** Local fallback icon skin. Image assets can replace entries after licensing is verified. */
export class IconCatalog {
  constructor(entries = {}) { this.entries = Object.freeze({ ...entries }); }
  get(id, category = "building") { return this.entries[id] ?? CATEGORY_ICONS[category] ?? "▦"; }
  getMetadata(id) { return this.entries[id] ? { source: "local-fallback", license: "project-generated" } : null; }
}

export const defaultIconCatalog = new IconCatalog({
  "planted-tree": "♣", "small-park": "✿", aquarium: "♒", "large-park": "❈", "community-center": "⌂", "basketball-court": "◉",
  "community-health-center": "✚", hospital: "✚", "fire-department": "♨", "police-station": "★", "parking-garage": "P", airport: "✈", "recycling-center": "♻", "subway-station": "▾", "concert-hall": "♫",
});
