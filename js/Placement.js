const STRUCTURE_LAYER = "structures";
const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);

/**
 * Immutable collection of validated building placements.
 * It is independent from Canvas interaction and plan persistence.
 */
export class PlacementStore {
  constructor(database, placements = []) {
    this.database = database;
    this.placements = new Map();

    for (const placement of placements) {
      this.addToMap(this.placements, placement);
    }
  }

  getById(id) {
    return this.placements.get(id) ?? null;
  }

  getAll() {
    return [...this.placements.values()];
  }

  withPlaced(placement) {
    const nextPlacements = new Map(this.placements);
    this.addToMap(nextPlacements, placement);
    return new PlacementStore(this.database, [...nextPlacements.values()]);
  }

  without(id) {
    const nextPlacements = new Map(this.placements);
    nextPlacements.delete(id);
    return new PlacementStore(this.database, [...nextPlacements.values()]);
  }

  withReplaced(id, replacement) {
    if (!this.placements.has(id)) throw new Error(`Unknown placement ID: ${id}`);
    return new PlacementStore(this.database, [...this.getAll().filter((placement) => placement.id !== id), replacement]);
  }

  addToMap(target, placement) {
    validatePlacement(placement, this.database);
    if (target.has(placement.id)) {
      throw new Error(`Duplicate placement ID: ${placement.id}`);
    }

    const normalized = Object.freeze({
      ...placement,
      layer: placement.layer ?? STRUCTURE_LAYER,
    });
    for (const existingPlacement of target.values()) {
      if (collides(normalized, existingPlacement, this.database)) {
        throw new Error(`Placement ${normalized.id} overlaps ${existingPlacement.id}.`);
      }
    }

    target.set(normalized.id, normalized);
  }
}

function validatePlacement(placement, database) {
  if (!placement || typeof placement !== "object") {
    throw new TypeError("Placement must be an object.");
  }

  assertNonEmptyString(placement.id, "id");
  assertNonEmptyString(placement.catalogItemId, "catalogItemId");
  assertGridCoordinate(placement.x, "x");
  assertGridCoordinate(placement.y, "y");

  if (placement.rotation !== undefined && !ALLOWED_ROTATIONS.has(placement.rotation)) {
    throw new RangeError("Placement rotation must be 0, 90, 180, or 270.");
  }

  if (placement.layer !== undefined) {
    assertNonEmptyString(placement.layer, "layer");
  }

  if (!database?.getById(placement.catalogItemId)) {
    throw new Error(`Unknown building ID: ${placement.catalogItemId}`);
  }
}

function collides(candidate, existing, database) {
  if ((candidate.layer ?? STRUCTURE_LAYER) !== (existing.layer ?? STRUCTURE_LAYER)) {
    return false;
  }

  const candidateBounds = placementBounds(candidate, database);
  const existingBounds = placementBounds(existing, database);
  return (
    candidateBounds.x < existingBounds.x + existingBounds.width &&
    candidateBounds.x + candidateBounds.width > existingBounds.x &&
    candidateBounds.y < existingBounds.y + existingBounds.height &&
    candidateBounds.y + candidateBounds.height > existingBounds.y
  );
}

function placementBounds(placement, database) {
  const building = database.getById(placement.catalogItemId);
  const rotated = placement.rotation === 90 || placement.rotation === 270;
  return {
    x: placement.x,
    y: placement.y,
    width: rotated ? building.size.height : building.size.width,
    height: rotated ? building.size.width : building.size.height,
  };
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`Placement ${name} must be a non-empty string.`);
  }
}

function assertGridCoordinate(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Placement ${name} coordinate must be an integer.`);
  }
}
