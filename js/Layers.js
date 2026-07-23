const LAYER_NAMES = ["grid", "terrain", "roads", "buildings", "warnings", "effects"];

/** Immutable visibility state for renderer layers. */
export class LayerState {
  constructor(values = {}) { this.values = Object.freeze(Object.fromEntries(LAYER_NAMES.map((name) => [name, name === "effects" ? values[name] === true : values[name] !== false]))); }
  isVisible(name) { assertLayer(name); return this.values[name]; }
  withVisibility(name, visible) { assertLayer(name); return new LayerState({ ...this.values, [name]: Boolean(visible) }); }
  toJSON() { return { ...this.values }; }
}
function assertLayer(name) { if (!LAYER_NAMES.includes(name)) throw new Error(`Unknown layer: ${name}`); }
