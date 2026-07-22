import { enablePanelResizing } from "./UI.js";
import { Renderer } from "./Renderer.js";
import { BuildingBrowser } from "./BuildingBrowser.js";
import { loadBuildingCatalog } from "./BuildingCatalog.js";
import { Inspector } from "./Inspector.js";
import { PlanEditor } from "./PlanEditor.js";
import { SaveManager } from "./SaveManager.js";
import { Minimap } from "./Minimap.js";

/**
 * Application composition root.
 * At this stage it only initializes the workspace layout controls.
 */
enablePanelResizing(document.querySelector(".app-shell"));

const canvas = document.querySelector("#planner-canvas");
const renderer = canvas ? new Renderer(canvas) : null;
const minimapCanvas = document.querySelector("#minimap-canvas");
const minimap = minimapCanvas ? new Minimap(minimapCanvas) : null;

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
    const planNameInput = document.querySelector("#plan-name");
    const gridSizeInput = document.querySelector("#grid-size");
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
      canvas.addEventListener("dragover", (event) => {
        if (event.dataTransfer.types.includes("application/x-pocket-city-building")) event.preventDefault();
      });
      canvas.addEventListener("drop", (event) => {
        const buildingId = event.dataTransfer.getData("application/x-pocket-city-building");
        if (!buildingId) return;
        event.preventDefault();
        try {
          const point = renderer.camera.screenToWorld(renderer.eventToCanvasPoint(event));
          editor.selectBuilding(buildingId);
          editor.placeAt(Math.floor(point.x / renderer.grid.cellSize), Math.floor(point.y / renderer.grid.cellSize));
          syncEditor();
          saveDraft();
          setStatus("Building placed.");
        } catch (error) {
          setStatus(error.message);
        }
      });
      renderer.setCanvasDragHandlers({
        onPointerDown: (worldPoint) => {
          if (editor.activeTerrainId) {
            editor.beginTerrainStroke();
            paintTerrainAt(worldPoint);
          } else if (editor.activeRoadTool) {
            editor.beginRoadStroke();
            editor.paintRoadPathTo(Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize));
          }
        },
        onDrag: (worldPoint) => {
          if (editor.activeTerrainId) paintTerrainAt(worldPoint);
          else if (editor.activeRoadTool) paintRoadAt(worldPoint);
        },
        onPointerUp: () => {
          if (editor.terrainStrokeActive) editor.endTerrainStroke();
          if (editor.roadStrokeActive) editor.endRoadStroke();
          saveDraft();
        },
      });
      const buildingTooltip = document.querySelector("#canvas-building-tooltip");
      renderer.setPointerMoveHandler((worldPoint, screenPoint) => {
        const cellX = Math.floor(worldPoint.x / renderer.grid.cellSize);
        const cellY = Math.floor(worldPoint.y / renderer.grid.cellSize);
        document.querySelector("#pointer-status").textContent = `X: ${cellX}  Y: ${cellY}`;
        const placement = editor.findPlacementAt(cellX, cellY);
        const building = placement ? database.getById(placement.catalogItemId) : null;
        if (!building || editor.layers?.isVisible("buildings") === false) {
          buildingTooltip.hidden = true;
          return;
        }
        buildingTooltip.textContent = `${building.name} · ${building.size.width} × ${building.size.height}`;
        buildingTooltip.style.left = `${Math.min(screenPoint.x + 12, renderer.cssWidth - 190)}px`;
        buildingTooltip.style.top = `${Math.min(screenPoint.y + 12, renderer.cssHeight - 40)}px`;
        buildingTooltip.hidden = false;
      });
      canvas.addEventListener("pointerleave", () => { buildingTooltip.hidden = true; });
      renderer.setViewportChangeHandler(updateZoomDisplay);
      renderer.setViewportChangeHandler((zoom) => { updateZoomDisplay(zoom); minimap?.setCamera(renderer.camera); });
      document.querySelector("#zoom-out")?.addEventListener("click", () => renderer.zoomBy(0.8));
      document.querySelector("#zoom-in")?.addEventListener("click", () => renderer.zoomBy(1.25));
      updateZoomDisplay(renderer.camera.zoom);
    }

    new BuildingBrowser(root, database, (building) => {
      if (building.terrainId) {
        editor.selectTerrain(building.terrainId);
        updateTerrainButtons();
        updateRoadButtons();
        activeInspector?.showStatistics(editor.statistics, editor.optimizationReport);
        setStatus(`${building.name} terrain tool active.`);
        return;
      }
      if (building.roadType) {
        editor.selectRoadTool(building.roadType);
        updateTerrainButtons();
        updateRoadButtons();
        setStatus(`${building.name} active.`);
        return;
      }
      editor.selectBuilding(building.id);
      updateTerrainButtons();
      updateRoadButtons();
      activeInspector?.showBuilding(building);
      setStatus(`Place ${building.name} on the grid.`);
      syncEditor();
    });

    document.querySelector("#select-tool")?.addEventListener("click", () => {
      editor.selectTool();
      updateTerrainButtons();
      updateRoadButtons();
      setStatus("Select tool active.");
    });

    document.querySelectorAll("[data-terrain]").forEach((button) => {
      button.addEventListener("click", () => {
        editor.selectTerrain(button.dataset.terrain);
        updateTerrainButtons();
        updateRoadButtons();
        setStatus(`${button.textContent} terrain tool active.`);
      });
    });

    document.querySelectorAll("[data-road-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        editor.selectRoadTool();
        updateTerrainButtons();
        updateRoadButtons();
        setStatus(`${button.textContent} road tool active.`);
      });
    });
    document.querySelectorAll("[data-bulldozer]").forEach((button) => {
      button.addEventListener("click", () => {
        editor.selectBulldozer();
        updateTerrainButtons();
        updateRoadButtons();
        setStatus("Bulldozer active. Click a building or road to delete it.");
      });
    });
    document.querySelectorAll("[data-layer]").forEach((button) => {
      button.addEventListener("click", () => {
        const name = button.dataset.layer;
        editor.setLayerVisibility(name, !editor.layers.isVisible(name));
        syncEditor();
        saveDraft();
      });
    });

    const undoButton = document.querySelector("#undo-action");
    const redoButton = document.querySelector("#redo-action");
    undoButton?.addEventListener("click", () => runHistoryAction(() => editor.undo(), "Undo applied."));
    redoButton?.addEventListener("click", () => runHistoryAction(() => editor.redo(), "Redo applied."));
    window.addEventListener("keydown", (event) => {
      if (isEditableTarget(event.target)) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      const action = event.shiftKey ? editor.redo.bind(editor) : editor.undo.bind(editor);
      runHistoryAction(action, event.shiftKey ? "Redo applied." : "Undo applied.");
    });
    window.addEventListener("keydown", (event) => {
      if (isEditableTarget(event.target) || (event.key !== "Delete" && event.key !== "Backspace")) return;
      if (!editor.deleteSelected()) return;
      event.preventDefault();
      syncEditor();
      saveDraft();
      setStatus("Placement deleted.");
    });
    window.addEventListener("keydown", (event) => {
      if (isEditableTarget(event.target)) return;
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const shortcut = event.key.toLowerCase();
        if (shortcut === "v") {
          editor.selectTool(); updateTerrainButtons(); updateRoadButtons(); setStatus("Select tool active."); return;
        }
        if (shortcut === "p") {
          editor.selectRoadTool(); updateTerrainButtons(); updateRoadButtons(); setStatus("Road brush active."); return;
        }
        if (shortcut === "b") {
          editor.selectBulldozer(); updateTerrainButtons(); updateRoadButtons(); setStatus("Bulldozer active."); return;
        }
        if (shortcut === "g" || shortcut === "w") {
          const layer = shortcut === "g" ? "grid" : "warnings";
          const button = document.querySelector(`[data-layer="${layer}"]`);
          button?.click();
          setStatus(`${layer} layer toggled.`);
          return;
        }
      }
      if (event.key === "Escape") {
        editor.selectTool();
        updateTerrainButtons();
        updateRoadButtons();
        setStatus("Select tool active.");
        return;
      }
      if (event.key.toLowerCase() === "r" && editor.selectedPlacement) {
        event.preventDefault();
        try {
          editor.rotateSelected();
          syncEditor();
          saveDraft();
          setStatus("Placement rotated.");
        } catch (error) {
          setStatus(error.message);
        }
        return;
      }
      const deltas = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      const delta = deltas[event.key];
      if (!delta || !editor.selectedPlacement) return;
      event.preventDefault();
      try {
        editor.moveSelected(...delta);
        syncEditor();
        saveDraft();
        setStatus("Placement moved.");
      } catch (error) {
        setStatus(error.message);
      }
    });

    document.querySelector("#new-plan")?.addEventListener("click", () => {
      editor = new PlanEditor(database);
      syncEditor();
      saveDraft();
      setStatus("New plan created.");
    });

    planNameInput?.addEventListener("change", () => {
      editor.setName(planNameInput.value);
      planNameInput.value = editor.name;
      saveDraft();
      setStatus("Plan name updated.");
    });

    document.querySelector("#apply-grid-size")?.addEventListener("click", () => {
      try {
        const size = Number(gridSizeInput.value);
        editor.resizeGrid(size, size);
        syncEditor();
        saveDraft();
        setStatus("Grid size updated.");
      } catch (error) {
        setStatus(error.message);
      }
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
      minimap?.setScene(editor.scene);
      minimap?.setCamera(renderer?.camera);
      document.querySelectorAll("[data-layer]").forEach((button) => {
        const visible = editor.layers.isVisible(button.dataset.layer);
        button.classList.toggle("is-visible", visible);
        button.setAttribute("aria-pressed", String(visible));
      });
      if (document.activeElement !== planNameInput) planNameInput.value = editor.name;
      gridSizeInput.value = String(editor.width);
      document.querySelector("#grid-status").textContent = `Grid: ${editor.width} × ${editor.height}`;
      undoButton.disabled = !editor.canUndo;
      redoButton.disabled = !editor.canRedo;
      const placement = editor.selectedPlacement;
      if (!placement) {
        activeInspector?.showStatistics(editor.statistics, editor.optimizationReport);
        return;
      }
      const building = database.getById(placement.catalogItemId);
      activeInspector?.showPlacement(building, placement, () => {
        editor.deleteSelected();
        syncEditor();
        saveDraft();
        setStatus("Placement deleted.");
      }, () => {
        try {
          editor.rotateSelected();
          syncEditor();
          saveDraft();
          setStatus("Placement rotated.");
        } catch (error) {
          setStatus(error.message);
        }
      }, (deltaX, deltaY) => {
        try {
          editor.moveSelected(deltaX, deltaY);
          syncEditor();
          saveDraft();
          setStatus("Placement moved.");
        } catch (error) {
          setStatus(error.message);
        }
      });
      setStatus(`Selected ${building.name} at ${placement.x}, ${placement.y}.`);
    }

    function paintTerrainAt(worldPoint) {
      try {
        editor.clickCell(Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize));
        syncEditor();
      } catch (error) {
        setStatus(error.message);
      }
    }

    function paintRoadAt(worldPoint) {
      try {
        editor.paintRoadPathTo(Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize));
        syncEditor();
      } catch (error) {
        setStatus(error.message);
      }
    }

    function updateTerrainButtons() {
      document.querySelectorAll("[data-terrain]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.terrain === editor.activeTerrainId);
      });
    }

    function updateRoadButtons() {
      document.querySelectorAll("[data-road-tool]").forEach((button) => {
        button.classList.toggle("is-active", editor.activeRoadTool && !editor.activeRoadErase);
      });
      document.querySelectorAll("[data-bulldozer]").forEach((button) => {
        button.classList.toggle("is-active", editor.activeBulldozer);
      });
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

function updateZoomDisplay(zoom) {
  const text = `${Math.round(zoom * 100)}%`;
  const toolbar = document.querySelector("#zoom-level");
  const status = document.querySelector("#canvas-status");
  if (toolbar) toolbar.textContent = text;
  if (status) status.textContent = `Canvas: ${text}`;
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

function isEditableTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
}
