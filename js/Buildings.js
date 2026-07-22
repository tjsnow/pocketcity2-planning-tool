/**
 * Validated, read-only building catalog.
 * Building records use the source-data shape in schemas/building.schema.json.
 */
export class BuildingDatabase {
  constructor(buildings = []) {
    if (!Array.isArray(buildings)) {
      throw new TypeError("Building database input must be an array.");
    }

    this.buildingsById = new Map();
    for (const building of buildings) {
      validateBuilding(building);
      if (this.buildingsById.has(building.id)) {
        throw new Error(`Duplicate building ID: ${building.id}`);
      }

      this.buildingsById.set(building.id, freezeBuilding(building));
    }
  }

  getById(id) {
    return this.buildingsById.get(id) ?? null;
  }

  getAll() {
    return [...this.buildingsById.values()];
  }

  getByCategory(category) {
    return this.getAll().filter((building) => building.category === category);
  }
}

export function createBuildingDatabase(catalog) {
  if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.buildings)) {
    throw new TypeError("Building catalog must contain a buildings array.");
  }

  if (!Number.isInteger(catalog.schemaVersion) || catalog.schemaVersion < 1) {
    throw new TypeError("Building catalog must contain a positive integer schemaVersion.");
  }

  return new BuildingDatabase(catalog.buildings);
}

function validateBuilding(building) {
  if (!building || typeof building !== "object") {
    throw new TypeError("Building record must be an object.");
  }

  assertNonEmptyString(building.id, "id");
  assertNonEmptyString(building.name, "name");
  assertNonEmptyString(building.category, "category");
  assertPositiveInteger(building.size?.width, "size.width");
  assertPositiveInteger(building.size?.height, "size.height");

  for (const property of ["levels", "effects", "radius", "unlock"]) {
    if (!(property in building)) {
      throw new TypeError(`Building ${property} is required.`);
    }
  }

  if (!Array.isArray(building.levels)) {
    throw new TypeError("Building levels must be an array.");
  }

  for (const property of ["effects", "radius", "unlock"]) {
    if (!isRecord(building[property])) {
      throw new TypeError(`Building ${property} must be an object.`);
    }
  }

  if (building.confidence !== undefined && building.confidence !== "community-reported" && building.confidence !== "verified") {
    throw new TypeError("Building confidence must be community-reported or verified.");
  }
  if (building.source !== undefined && (!isRecord(building.source) || typeof building.source.kind !== "string" || typeof building.source.reference !== "string")) {
    throw new TypeError("Building source must include kind and reference strings.");
  }
}

function freezeBuilding(building) {
  return Object.freeze({
    ...building,
    size: Object.freeze({ ...building.size }),
    levels: Object.freeze([...building.levels]),
    effects: Object.freeze({ ...building.effects }),
    radius: Object.freeze({ ...building.radius }),
    unlock: Object.freeze({ ...building.unlock }),
    source: building.source ? Object.freeze({ ...building.source }) : undefined,
  });
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`Building ${name} must be a non-empty string.`);
  }
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`Building ${name} must be a positive integer.`);
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
