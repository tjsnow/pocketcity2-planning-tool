/** Immutable rectangular planning districts. Districts are labels, not game simulation rules. */
export class DistrictStore {
  constructor(districts = []) {
    if (!Array.isArray(districts)) throw new TypeError("Districts must be an array.");
    this.districts = new Map();
    for (const district of districts) {
      validateDistrict(district);
      if (this.districts.has(district.id)) throw new Error(`Duplicate district ID: ${district.id}`);
      this.districts.set(district.id, freezeDistrict(district));
    }
  }

  getAll() { return [...this.districts.values()]; }
  getById(id) { return this.districts.get(id) ?? null; }
  withDistrict(district) {
    validateDistrict(district);
    if (this.districts.has(district.id)) throw new Error(`Duplicate district ID: ${district.id}`);
    return new DistrictStore([...this.getAll(), district]);
  }
  without(id) {
    if (!this.districts.has(id)) return this;
    return new DistrictStore(this.getAll().filter((district) => district.id !== id));
  }
  withinBounds(width, height) {
    return this.getAll().every((district) => district.x + district.width <= width && district.y + district.height <= height);
  }
}

function validateDistrict(district) {
  if (!district || typeof district !== "object") throw new TypeError("District must be an object.");
  if (typeof district.id !== "string" || district.id.trim() === "") throw new TypeError("District ID must be a non-empty string.");
  if (typeof district.name !== "string" || district.name.trim() === "") throw new TypeError("District name must be a non-empty string.");
  for (const key of ["x", "y", "width", "height"]) {
    if (!Number.isInteger(district[key]) || district[key] < 0) throw new TypeError(`District ${key} must be a non-negative integer.`);
  }
  if (district.width < 1 || district.height < 1) throw new RangeError("District dimensions must be positive.");
  if (district.color !== undefined && (typeof district.color !== "string" || district.color.trim() === "")) throw new TypeError("District color must be a non-empty string.");
}

function freezeDistrict(district) {
  return Object.freeze({ ...district });
}
