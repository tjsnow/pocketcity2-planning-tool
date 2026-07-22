const DRAFT_KEY = "pocket-city-planner.draft.v1";

/** Browser persistence and portable JSON file helpers. */
export class SaveManager {
  loadDraft() {
    const serialized = localStorage.getItem(DRAFT_KEY);
    return serialized ? JSON.parse(serialized) : null;
  }

  saveDraft(document) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(document));
  }

  download(planDocument) {
    const blob = new Blob([JSON.stringify(planDocument, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(planDocument.name)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async readFile(file) {
    if (!(file instanceof File)) throw new TypeError("Select a JSON plan file.");
    return JSON.parse(await file.text());
  }
}

function safeFileName(name) {
  const result = String(name).trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
  return result || "pocket-city-plan";
}
