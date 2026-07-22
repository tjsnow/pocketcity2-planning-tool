export const DRAFT_KEY = "pocket-city-planner.draft.v1";
const MAX_DRAFT_BYTES = 2_000_000;
const MAX_PLAN_FILE_BYTES = 10_000_000;

/** Browser persistence and portable JSON file helpers. */
export class SaveManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  loadDraft() {
    const serialized = this.storage?.getItem(DRAFT_KEY);
    if (!serialized) return null;
    try {
      return JSON.parse(serialized);
    } catch {
      this.clearDraft();
      return null;
    }
  }

  saveDraft(document) {
    const serialized = JSON.stringify(document);
    if (serialized.length > MAX_DRAFT_BYTES) throw new Error("Draft is too large to store in browser storage.");
    try {
      this.storage?.setItem(DRAFT_KEY, serialized);
    } catch (error) {
      throw new Error(`Draft could not be saved: ${error.message}`);
    }
  }

  clearDraft() {
    this.storage?.removeItem(DRAFT_KEY);
  }

  hasDraft() {
    return Boolean(this.storage?.getItem(DRAFT_KEY));
  }

  download(planDocument) {
    const blob = new Blob([serializePlan(planDocument)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(planDocument.name)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async readFile(file) {
    if (typeof File === "undefined" || !(file instanceof File)) throw new TypeError("Select a JSON plan file.");
    if (file.size > MAX_PLAN_FILE_BYTES) throw new RangeError("Plan file is too large to import.");
    return parsePlan(await file.text());
  }
}

export function serializePlan(planDocument) {
  if (!planDocument || typeof planDocument !== "object" || Array.isArray(planDocument)) throw new TypeError("Plan document must be an object.");
  return JSON.stringify(planDocument, null, 2);
}

export function parsePlan(serialized) {
  if (typeof serialized !== "string" || serialized.length > MAX_PLAN_FILE_BYTES) throw new RangeError("Plan JSON is missing or too large.");
  let document;
  try { document = JSON.parse(serialized); } catch { throw new TypeError("Plan file is not valid JSON."); }
  if (!document || typeof document !== "object" || Array.isArray(document)) throw new TypeError("Plan file must contain a JSON object.");
  return document;
}

function safeFileName(name) {
  const result = String(name).trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
  return result || "pocket-city-plan";
}
