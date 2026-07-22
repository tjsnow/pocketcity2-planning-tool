/** Planning annotations and measurement helpers; intentionally independent of DOM and rendering. */
export class NoteStore {
  constructor(notes = []) {
    if (!Array.isArray(notes)) throw new TypeError("Notes must be an array.");
    this.notes = new Map();
    for (const note of notes) {
      validateNote(note);
      if (this.notes.has(note.id)) throw new Error(`Duplicate note ID: ${note.id}`);
      this.notes.set(note.id, Object.freeze({ ...note }));
    }
  }
  getAll() { return [...this.notes.values()]; }
  getById(id) { return this.notes.get(id) ?? null; }
  withNote(note) {
    validateNote(note);
    if (this.notes.has(note.id)) throw new Error(`Duplicate note ID: ${note.id}`);
    return new NoteStore([...this.getAll(), note]);
  }
  without(id) { return this.notes.has(id) ? new NoteStore(this.getAll().filter((note) => note.id !== id)) : this; }
  withinBounds(width, height) { return this.getAll().every((note) => note.x < width && note.y < height); }
}

export function measureGridSegment(start, end) {
  validatePoint(start, "start");
  validatePoint(end, "end");
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Object.freeze({ start: Object.freeze({ ...start }), end: Object.freeze({ ...end }), dx, dy, manhattan: Math.abs(dx) + Math.abs(dy), euclidean: Math.hypot(dx, dy) });
}

function validateNote(note) {
  if (!note || typeof note !== "object") throw new TypeError("Note must be an object.");
  if (typeof note.id !== "string" || note.id.trim() === "") throw new TypeError("Note ID must be a non-empty string.");
  if (!Number.isInteger(note.x) || note.x < 0 || !Number.isInteger(note.y) || note.y < 0) throw new TypeError("Note coordinates must be non-negative integers.");
  if (typeof note.text !== "string" || note.text.trim() === "") throw new TypeError("Note text must be a non-empty string.");
  if (note.text.length > 500) throw new RangeError("Note text cannot exceed 500 characters.");
}

function validatePoint(point, name) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) throw new TypeError(`${name} must contain integer x and y coordinates.`);
}
