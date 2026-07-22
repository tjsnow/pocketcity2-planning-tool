import { enablePanelResizing } from "./UI.js";
import { Renderer } from "./Renderer.js";
import { BuildingBrowser } from "./BuildingBrowser.js";
import { loadBuildingCatalog } from "./BuildingCatalog.js";
import { Inspector } from "./Inspector.js";
import { PlanEditor } from "./PlanEditor.js";
import { SaveManager } from "./SaveManager.js";

/**
 * Application composition root.
 * At this stage it only initializes the workspace layout controls.
 */
enablePanelResizing(document.querySelector(".app-shell"));

const canvas = document.querySelector("#planner-canvas");
const renderer = canvas ? new Renderer(canvas) : null;

const inspectorRoot = document.querySelector("#inspector-content");
const inspector = inspectorRoot ? new Inspector(inspectorRoot) : null;
const buildingBrowserRoot = document.querySelector(".building-browser");
if (buildingBrowserRoot) {
  initializeBuildingBrowser(buildingBrowserRoot, inspector);
}

async function initializeBuildingBrowser(root, activeInspector) {
  try {
    const database = await loadBuildingCatalog();
    const saveManager = new SaveManager();
    let editor = restoreDraft(database, saveManager);
    renderer?.camera.setViewport(renderer.cssWidth, renderer.cssHeight);
    if (renderer) {
      renderer.camera.positionX = editor.width * renderer.grid.cellSize / 2;
      renderer.camera.positionY = editor.height * renderer.grid.cellSize / 2;
      renderer.setScene(editor.scene);
      renderer.setCanvasClickHandler((worldPoint) => {
        try {
          editor.clickCell(Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize));
          syncEditor();
          saveDraft();
        } catch (error) {
          setStatus(error.message);
        }
      });
    }

    new BuildingBrowser(root, database, (building) => {
      editor.selectBuilding(building.id);
      activeInspector?.showBuilding(building);
      setStatus(`Place ${building.name} on the grid.`);
      syncEditor();
    });

    document.querySelector("#select-tool")?.addEventListener("click", () => {
      editor.selectTool();
      setStatus("Select tool active.");
    });

    const undoButton = document.querySelector("#undo-action");
    const redoButton = document.querySelector("#redo-action");
    undoButton?.addEventListener("click", () => runHistoryAction(() => editor.undo(), "Undo applied."));
    redoButton?.addEventListener("click", () => runHistoryAction(() => editor.redo(), "Redo applied."));
    window.addEventListener("keydown", (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      const action = event.shiftKey ? editor.redo.bind(editor) : editor.undo.bind(editor);
      runHistoryAction(action, event.shiftKey ? "Redo applied." : "Undo applied.");
    });

    document.querySelector("#new-plan")?.addEventListener("click", () => {
      editor = new PlanEditor(database);
      syncEditor();
      saveDraft();
      setStatus("New plan created.");
    });

    document.querySelector("#save-plan")?.addEventListener("click", () => {
      saveManager.download(editor.toDocument());
      setStatus("Plan downloaded as JSON.");
    });

    const fileInput = document.querySelector("#plan-file-input");
    document.querySelector("#open-plan")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", async () => {
      try {
        const [file] = fileInput.files;
        if (!file) return;
        editor = PlanEditor.fromDocument(database, await saveManager.readFile(file));
        syncEditor();
        saveDraft();
        setStatus("Plan imported.");
      } catch (error) {
        setStatus(error.message || "Plan import failed.");
      } finally {
        fileInput.value = "";
      }
    });

    function syncEditor() {
      renderer?.setScene(editor.scene);
      undoButton.disabled = !editor.canUndo;
      redoButton.disabled = !editor.canRedo;
      const placement = editor.selectedPlacement;
      if (!placement) {
        activeInspector?.showEmpty();
        return;
      }
      const building = database.getById(placement.catalogItemId);
      activeInspector?.showPlacement(building, placement, () => {
        editor.deleteSelected();
        syncEditor();
        saveDraft();
        setStatus("Placement deleted.");
      });
      setStatus(`Selected ${building.name} at ${placement.x}, ${placement.y}.`);
    }

    function saveDraft() {
      try {
        saveManager.saveDraft(editor.toDocument());
      } catch {
        setStatus("Draft could not be saved in this browser.");
      }
    }

    function runHistoryAction(action, message) {
      if (!action()) return;
      syncEditor();
      saveDraft();
      setStatus(message);
    }
  } catch {
    root.querySelector("#building-results")?.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "building-browser-message",
        textContent: "Building catalog is unavailable. Serve the project from a static web server and try again.",
      }),
    );
  }
}

function restoreDraft(database, saveManager) {
  try {
    const draft = saveManager.loadDraft();
    return draft ? PlanEditor.fromDocument(database, draft) : new PlanEditor(database);
  } catch {
    return new PlanEditor(database);
  }
}

function setStatus(message) {
  const status = document.querySelector("#editor-status");
  if (!status) return;
  const indicator = document.createElement("span");
  indicator.className = "status-dot";
  indicator.setAttribute("aria-hidden", "true");
  status.replaceChildren(indicator, document.createTextNode(` ${message}`));
}
