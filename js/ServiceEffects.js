const DEFINITIONS = {
  "community-health-center": { effectType: "health", mode: "local", maxLevel: 1, defaultRadius: 6, label: "Health coverage" },
  hospital: { effectType: "health", mode: "local", maxLevel: 3, defaultRadius: 6, label: "Health coverage" },
  "fire-department": { effectType: "fire", mode: "local", maxLevel: 3, defaultRadius: 6, label: "Fire coverage" },
  "police-station": { effectType: "police", mode: "local", maxLevel: 3, defaultRadius: 6, label: "Police coverage" },
  "public-works": { effectType: "public-works", mode: "local", maxLevel: 1, defaultRadius: 5, label: "Public Works coverage" },
  "home-improvement-center": { effectType: "home-improvement", mode: "local", maxLevel: 1, defaultRadius: 5, label: "Home Improvement coverage" },
  "carbon-capture-plant": { effectType: "pollution", mode: "local", maxLevel: 1, defaultRadius: 5, label: "Pollution coverage" },
  "traffic-light": { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  "bus-stop": { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  "parking-garage": { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  "light-rail-stop": { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  "high-rail-station": { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  "subway-station": { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  bridge: { effectType: "traffic", mode: "local", maxLevel: 1, defaultRadius: 4, label: "Traffic coverage" },
  "water-tower": { effectType: "water", mode: "network", maxLevel: 1, defaultRadius: 8, label: "Water network capacity" },
  "large-water-tower": { effectType: "water", mode: "network", maxLevel: 1, defaultRadius: 10, label: "Water network capacity" },
  "power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 8, label: "Power network capacity" },
  "large-power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 10, label: "Power network capacity" },
  "hydro-power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 10, label: "Power network capacity" },
  "fusion-power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 12, label: "Power network capacity" },
  "wind-power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 10, label: "Power network capacity" },
  "solar-power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 12, label: "Power network capacity" },
  "waste-power-plant": { effectType: "power", requires: [], mode: "network", maxLevel: 1, defaultRadius: 12, label: "Power network capacity" },
  "biomass-facility": { effectType: "power", provides: ["power", "water", "sewage"], requires: [], mode: "network", maxLevel: 1, defaultRadius: 8, label: "Power, water, and sewage network capacity" },
  "sewage-drain": { effectType: "sewage", mode: "citywide", maxLevel: 1, defaultRadius: 8, label: "Sewage capacity" },
  "sewage-lagoon": { effectType: "sewage", mode: "citywide", maxLevel: 1, defaultRadius: 10, label: "Sewage capacity" },
  "water-treatment-plant": { effectType: "sewage", provides: ["water", "sewage"], mode: "citywide", maxLevel: 3, defaultRadius: 12, label: "Sewage capacity" },
  "waste-incinerator": { effectType: "waste", mode: "citywide", maxLevel: 3, defaultRadius: 8, label: "Waste capacity" },
  landfill: { effectType: "waste", mode: "citywide", maxLevel: 1, label: "Waste capacity" },
  "recycling-center": { effectType: "waste", mode: "citywide", maxLevel: 1, label: "Waste capacity" },
  "shipping-dock": { effectType: "waste", mode: "citywide", maxLevel: 1, label: "Waste capacity" },
  "elementary-school": { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  "high-school": { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  college: { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  university: { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  library: { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  museum: { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  "historical-center": { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  "technology-tower": { effectType: "education", mode: "citywide", maxLevel: 1, label: "Education capacity" },
  "community-center": { effectType: "community", mode: "citywide", maxLevel: 1, label: "Community capacity" },
  "forest-lodge": { effectType: "community", mode: "citywide", maxLevel: 1, label: "Community capacity" },
  "concert-hall": { effectType: "community", mode: "citywide", maxLevel: 1, label: "Community capacity" },
  "event-center": { effectType: "community", mode: "citywide", maxLevel: 1, label: "Community capacity" },
  "large-gazebo": { effectType: "community", mode: "citywide", maxLevel: 1, label: "Community capacity" },
};

const EFFECT_TYPES = [
  ["health", "Health coverage"], ["fire", "Fire coverage"], ["police", "Police coverage"],
  ["public-works", "Public Works"], ["home-improvement", "Home Improvement"], ["pollution", "Pollution control"],
  ["traffic", "Traffic coverage"], ["water", "Water network"], ["power", "Power network"], ["sewage", "Sewage capacity"], ["waste", "Waste capacity"], ["education", "Education capacity"], ["community", "Community capacity"],
];

export function serviceDefinition(buildingId) { return DEFINITIONS[buildingId] ?? null; }
export function getEffectTypes() { return EFFECT_TYPES.map(([id, label]) => ({ id, label })); }
export function isLocalEffect(effectType) { return !["water", "power", "sewage", "waste", "education", "community"].includes(effectType); }
export function supportsEffectType(buildingId, effectType) {
  const definition = serviceDefinition(buildingId);
  return Boolean(definition && (definition.effectType === effectType || definition.provides?.includes(effectType)));
}
export function requiredUtilitiesFor(buildingId) {
  const requirements = serviceDefinition(buildingId)?.requires;
  return requirements ? [...requirements] : ["power", "water", "sewage"];
}
export function coverageRadiusFor(buildingId, placement = {}) {
  const definition = serviceDefinition(buildingId);
  if (!definition) return null;
  if (Number.isFinite(placement.coverageRadius)) return placement.coverageRadius;
  if (!Number.isFinite(definition.defaultRadius)) return null;
  const level = Math.max(1, Number(placement.level) || 1);
  return definition.defaultRadius + (level - 1) * 2;
}
export function effectColor(effectType) { return ({ health: "#58b7ff", fire: "#ff806b", police: "#9b8cff", "public-works": "#f0c766", "home-improvement": "#76d6a1", pollution: "#d48bdb", traffic: "#58d6c5" }[effectType] ?? "#74a9ff"); }
