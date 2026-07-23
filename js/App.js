import { enablePanelResizing } from "./UI.js";
import { Renderer } from "./Renderer.js";
import { BuildingBrowser } from "./BuildingBrowser.js";
import { loadBuildingCatalog } from "./BuildingCatalog.js";
import { Inspector } from "./Inspector.js";
import { PlanEditor } from "./PlanEditor.js";
import { SaveManager } from "./SaveManager.js";
import { Minimap } from "./Minimap.js";
import { getEffectTypes } from "./ServiceEffects.js";

const TERRAIN_AREA_OPTIONS = [
  { id: "planted-tree", name: "Planted Tree" }, { id: "water", name: "Water" }, { id: "sand", name: "Sand" }, { id: "soil", name: "Soil" }, { id: "grass", name: "Grass" }, { id: "canal", name: "Canal" }, { id: "wild-tree", name: "Wild Tree" }, { id: "mountains", name: "Mountains" }, { id: "palm-tree", name: "Palm Tree" }, { id: "unassigned", name: "Erase terrain" },
];

/**
 * Application composition root.
 * At this stage it only initializes the workspace layout controls.
 */
enablePanelResizing(document.querySelector(".app-shell"));

const changelogButton = document.querySelector("#changelog-button");
const changelogPanel = document.querySelector("#changelog-panel");
const changelogClose = document.querySelector("#changelog-close");
function setChangelogOpen(open) {
  changelogPanel?.toggleAttribute("hidden", !open);
  changelogButton?.setAttribute("aria-expanded", String(open));
  if (open) changelogClose?.focus();
}
changelogButton?.addEventListener("click", () => setChangelogOpen(changelogPanel?.hasAttribute("hidden")));
changelogClose?.addEventListener("click", () => { setChangelogOpen(false); changelogButton?.focus(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && changelogPanel && !changelogPanel.hasAttribute("hidden")) {
    setChangelogOpen(false);
    changelogButton?.focus();
  }
});

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
    let activeNavigationTool = "select";
    let areaDeleteMode = false;
    let areaTerrainMode = false;
    let areaZoneMode = false;
    let activeZoneId = null;
    let placementMoveMode = false;
    let areaDeleteStart = null;
    let areaDeleteBounds = null;
    const areaDeleteDialog = document.querySelector("#area-delete-dialog");
    const areaDeleteSummary = document.querySelector("#area-delete-summary");
    const areaTerrainDialog = document.querySelector("#area-terrain-dialog");
    const areaTerrainSummary = document.querySelector("#area-terrain-summary");
    const areaTerrainOptions = document.querySelector("#area-terrain-options");
    const clearPlanDialog = document.querySelector("#clear-plan-dialog");
    const planNameInput = document.querySelector("#plan-name");
    const gridSizeInput = document.querySelector("#grid-size");
    const showShortcutsInput = document.querySelector("#show-shortcuts");
    const effectTypeInput = document.querySelector("#effect-type");
    if (effectTypeInput && effectTypeInput.options.length === 0) {
      for (const effect of getEffectTypes()) {
        const option = document.createElement("option");
        option.value = effect.id;
        option.textContent = effect.label;
        effectTypeInput.append(option);
      }
    }
    renderer?.setEffectType(effectTypeInput?.value || "health");
    effectTypeInput?.addEventListener("change", () => {
      renderer?.setEffectType(effectTypeInput.value);
      setStatus(`${effectTypeInput.options[effectTypeInput.selectedIndex].textContent} effect layer selected.`);
    });
    let showShortcuts = true;
    try { showShortcuts = localStorage.getItem("pocket-city-show-shortcuts") !== "false"; } catch { /* use default */ }
    if (showShortcutsInput) showShortcutsInput.checked = showShortcuts;
    document.body.classList.toggle("hide-shortcuts", !showShortcuts);
    showShortcutsInput?.addEventListener("change", () => {
      document.body.classList.toggle("hide-shortcuts", !showShortcutsInput.checked);
      try { localStorage.setItem("pocket-city-show-shortcuts", String(showShortcutsInput.checked)); } catch { /* preference remains session-local */ }
    });
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
          if (areaDeleteMode || areaTerrainMode || areaZoneMode) {
            areaDeleteStart = worldToCell(worldPoint);
            areaDeleteBounds = areaFromCells(areaDeleteStart, areaDeleteStart);
            renderer.setAreaDeletePreview(areaDeleteBounds);
            return;
          }
          if (editor.activeTerrainId) {
            editor.beginTerrainStroke();
            paintTerrainAt(worldPoint);
          } else if (editor.activeRoadTool) {
            editor.beginRoadStroke();
            editor.paintRoadPathTo(Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize));
          } else if (editor.activeBulldozer) {
            editor.beginBulldozerStroke();
            paintBulldozerAt(worldPoint);
          } else if (activeNavigationTool === "select" && editor.selectedPlacement && editor.findPlacementAt(...cellFromWorld(worldPoint))?.id === editor.selectedPlacement.id) {
            placementMoveMode = true;
            editor.beginPlacementMoveStroke();
          }
        },
        onDrag: (worldPoint) => {
          if ((areaDeleteMode || areaTerrainMode || areaZoneMode) && areaDeleteStart) {
            areaDeleteBounds = areaFromCells(areaDeleteStart, worldToCell(worldPoint));
            renderer.setAreaDeletePreview(areaDeleteBounds);
            return;
          }
          if (editor.activeTerrainId) paintTerrainAt(worldPoint);
          else if (editor.activeRoadTool) paintRoadAt(worldPoint);
          else if (editor.activeBulldozer) paintBulldozerAt(worldPoint);
          else if (placementMoveMode) movePlacementAt(worldPoint);
        },
        onPointerUp: () => {
          if (areaDeleteMode && areaDeleteBounds) {
            openAreaDeleteDialog();
            areaDeleteStart = null;
            return;
          }
          if (areaTerrainMode && areaDeleteBounds) {
            openAreaTerrainDialog();
            areaDeleteStart = null;
            return;
          }
          if (areaZoneMode && areaDeleteBounds) {
            applyAreaZone();
            return;
          }
          if (editor.terrainStrokeActive) editor.endTerrainStroke();
          if (editor.roadStrokeActive) editor.endRoadStroke();
          if (editor.bulldozerStrokeActive) editor.endBulldozerStroke();
          if (editor.placementMoveStrokeActive) editor.endPlacementMoveStroke();
          placementMoveMode = false;
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
      cancelAreaDelete();
      if (building.terrainId) {
        editor.selectTerrain(building.terrainId);
        updateTerrainButtons();
        updateRoadButtons();
        activeInspector?.showStatistics(editor.statistics, editor.optimizationReport);
        setStatus(`${building.name} terrain tool active.`);
        return;
      }
      if (building.category === "zone") {
        activeZoneId = building.id;
        areaZoneMode = true;
        areaDeleteMode = false;
        areaTerrainMode = false;
        areaDeleteStart = null;
        areaDeleteBounds = null;
        renderer?.setAreaDeletePreview(null);
        updateAreaDeleteButton();
        setStatus(`${building.name} area tool active. Drag across cells to fill the zone.`);
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
      cancelAreaDelete();
      activeNavigationTool = "select";
      renderer?.setPanMode(false);
      editor.selectTool();
      updateTerrainButtons();
      updateRoadButtons();
      updateNavigationButtons();
      setStatus("Select tool active.");
    });
    document.querySelector("#pan-tool")?.addEventListener("click", () => {
      activeNavigationTool = "pan";
      renderer?.setPanMode(true);
      updateNavigationButtons();
      setStatus("Pan tool active. Drag the canvas to move the view.");
    });

    document.querySelectorAll("[data-terrain]").forEach((button) => {
      button.addEventListener("click", () => {
        cancelAreaDelete();
        editor.selectTerrain(button.dataset.terrain);
        updateTerrainButtons();
        updateRoadButtons();
        setStatus(`${button.textContent} terrain tool active.`);
      });
    });

    document.querySelectorAll("[data-road-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        cancelAreaDelete();
        editor.selectRoadTool();
        updateTerrainButtons();
        updateRoadButtons();
        setStatus(`${button.textContent} road tool active.`);
      });
    });
    document.querySelectorAll("[data-bulldozer]").forEach((button) => {
      button.addEventListener("click", () => {
        cancelAreaDelete();
        editor.selectBulldozer();
        updateTerrainButtons();
        updateRoadButtons();
        setStatus("Bulldozer active. Click a building or road to delete it.");
      });
    });
    document.querySelectorAll("[data-area-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        const wasActive = areaDeleteMode;
        cancelAreaDelete();
        areaDeleteMode = !wasActive;
        areaDeleteStart = null;
        areaDeleteBounds = null;
        renderer?.setAreaDeletePreview(null);
        areaDeleteDialog?.setAttribute("hidden", "");
        updateAreaDeleteButton();
        setStatus(areaDeleteMode ? "Area delete active. Drag across the area to select items." : "Area delete canceled.");
      });
    });
    document.querySelectorAll("[data-area-terrain]").forEach((button) => {
      button.addEventListener("click", () => {
        const wasActive = areaTerrainMode;
        cancelAreaDelete();
        areaTerrainMode = !wasActive;
        areaDeleteStart = null;
        areaDeleteBounds = null;
        renderer?.setAreaDeletePreview(null);
        updateAreaDeleteButton();
        setStatus(areaTerrainMode ? "Area terrain active. Drag across the area to choose terrain." : "Area terrain canceled.");
      });
    });
    document.querySelectorAll("[data-area-delete-cancel]").forEach((button) => button.addEventListener("click", () => {
      areaDeleteMode = false;
      areaTerrainMode = false;
      areaDeleteStart = null;
      areaDeleteBounds = null;
      renderer?.setAreaDeletePreview(null);
      areaDeleteDialog?.setAttribute("hidden", "");
      areaTerrainDialog?.setAttribute("hidden", "");
      updateAreaDeleteButton();
      setStatus("Area delete canceled.");
    }));
    document.querySelectorAll("[data-area-terrain-cancel]").forEach((button) => button.addEventListener("click", () => {
      cancelAreaDelete();
      setStatus("Area terrain canceled.");
    }));
    document.querySelector("[data-area-delete-confirm]")?.addEventListener("click", () => {
      if (!areaDeleteBounds) return;
      const removed = editor.deleteArea(areaDeleteBounds);
      areaDeleteMode = false;
      areaTerrainMode = false;
      areaDeleteStart = null;
      areaDeleteBounds = null;
      renderer?.setAreaDeletePreview(null);
      areaDeleteDialog?.setAttribute("hidden", "");
      updateAreaDeleteButton();
      syncEditor();
      saveDraft();
      setStatus(`Deleted ${removed.placements.length} building(s) and ${removed.roads.length} road segment(s).`);
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
          activeNavigationTool = "select"; renderer?.setPanMode(false); updateNavigationButtons();
          editor.selectTool(); updateTerrainButtons(); updateRoadButtons(); setStatus("Select tool active."); return;
        }
        if (shortcut === "h") {
          activeNavigationTool = "pan"; renderer?.setPanMode(true); updateNavigationButtons(); setStatus("Pan tool active."); return;
        }
        if (shortcut === "p") {
          cancelAreaDelete();
          editor.selectRoadTool(); updateTerrainButtons(); updateRoadButtons(); setStatus("Road brush active."); return;
        }
        if (shortcut === "b") {
          cancelAreaDelete();
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
        cancelAreaDelete();
        clearPlanDialog?.setAttribute("hidden", "");
        activeNavigationTool = "select"; renderer?.setPanMode(false); updateNavigationButtons();
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

    document.querySelector("#generate-city")?.addEventListener("click", () => {
      try {
        cancelAreaDelete();
        const result = editor.generateCity();
        syncEditor();
        saveDraft();
        setStatus(`Generated city with ${result.buildingCount} buildings and ${result.roadCount} road segments.`);
      } catch (error) {
        setStatus(error.message || "City generation failed.");
      }
    });

    document.querySelector("#clear-plan")?.addEventListener("click", () => {
      cancelAreaDelete();
      clearPlanDialog?.removeAttribute("hidden");
    });
    document.querySelectorAll("[data-clear-cancel]").forEach((button) => button.addEventListener("click", () => {
      clearPlanDialog?.setAttribute("hidden", "");
      setStatus("Clear canceled.");
    }));
    document.querySelector("[data-clear-confirm]")?.addEventListener("click", () => {
      const cleared = editor.clearPlan();
      clearPlanDialog?.setAttribute("hidden", "");
      if (!cleared) { setStatus("Plan is already empty."); return; }
      syncEditor();
      saveDraft();
      setStatus("Plan cleared.");
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
      updateNavigationButtons();
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
      }, (level) => {
        try {
          editor.setSelectedLevel(level);
          syncEditor();
          saveDraft();
          setStatus(`Building level set to ${level}.`);
        } catch (error) {
          setStatus(error.message);
        }
      }, (radius) => {
        try {
          editor.setSelectedCoverageRadius(radius);
          syncEditor();
          saveDraft();
          setStatus(radius === null ? "Planning radius cleared." : `Planning radius set to ${radius} tiles.`);
        } catch (error) {
          setStatus(error.message);
        }
      }, editor.optimizationReport.issues.filter((issue) => issue.subjectId === placement.id));
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

    function paintBulldozerAt(worldPoint) {
      try {
        const removed = editor.deleteAtCell(Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize));
        if (removed) {
          syncEditor();
          setStatus("Bulldozer removed item.");
        }
      } catch (error) {
        setStatus(error.message);
      }
    }

    function movePlacementAt(worldPoint) {
      try {
        const [x, y] = cellFromWorld(worldPoint);
        if (editor.moveSelectedTo(x, y)) {
          syncEditor();
          setStatus(`Moved placement to ${x}, ${y}.`);
        }
      } catch (error) {
        setStatus(error.message);
      }
    }

    function cellFromWorld(worldPoint) {
      return [Math.floor(worldPoint.x / renderer.grid.cellSize), Math.floor(worldPoint.y / renderer.grid.cellSize)];
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

    function updateNavigationButtons() {
      document.querySelector("#select-tool")?.classList.toggle("is-active", activeNavigationTool === "select");
      document.querySelector("#pan-tool")?.classList.toggle("is-active", activeNavigationTool === "pan");
    }

    function updateAreaDeleteButton() {
      document.querySelectorAll("[data-area-delete]").forEach((button) => button.classList.toggle("is-active", areaDeleteMode));
      document.querySelectorAll("[data-area-terrain]").forEach((button) => button.classList.toggle("is-active", areaTerrainMode));
    }

    function cancelAreaDelete() {
      if (!areaDeleteMode && !areaTerrainMode && !areaZoneMode && !areaDeleteBounds) return;
      areaDeleteMode = false;
      areaTerrainMode = false;
      areaZoneMode = false;
      activeZoneId = null;
      areaDeleteStart = null;
      areaDeleteBounds = null;
      renderer?.setAreaDeletePreview(null);
      areaDeleteDialog?.setAttribute("hidden", "");
      areaTerrainDialog?.setAttribute("hidden", "");
      updateAreaDeleteButton();
    }

    function worldToCell(worldPoint) {
      return {
        x: Math.max(0, Math.min(editor.width - 1, Math.floor(worldPoint.x / renderer.grid.cellSize))),
        y: Math.max(0, Math.min(editor.height - 1, Math.floor(worldPoint.y / renderer.grid.cellSize))),
      };
    }

    function areaFromCells(start, end) {
      return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x) + 1, height: Math.abs(end.y - start.y) + 1 };
    }

    function openAreaDeleteDialog() {
      const contents = editor.getAreaContents(areaDeleteBounds);
      const terrainCount = editor.terrain.toCells().filter((cell) => cell.x >= areaDeleteBounds.x && cell.x < areaDeleteBounds.x + areaDeleteBounds.width && cell.y >= areaDeleteBounds.y && cell.y < areaDeleteBounds.y + areaDeleteBounds.height).length;
      areaDeleteSummary.textContent = `${contents.placements.length} building(s), ${contents.roads.length} road segment(s) selected. ${terrainCount} terrain cell(s) will remain unchanged.`;
      areaDeleteDialog?.removeAttribute("hidden");
    }

    function openAreaTerrainDialog() {
      const terrainCount = editor.terrain.toCells().filter((cell) => cell.x >= areaDeleteBounds.x && cell.x < areaDeleteBounds.x + areaDeleteBounds.width && cell.y >= areaDeleteBounds.y && cell.y < areaDeleteBounds.y + areaDeleteBounds.height).length;
      areaTerrainSummary.textContent = `${areaDeleteBounds.width} × ${areaDeleteBounds.height} cells selected (${terrainCount} currently painted). Water and Mountains remove buildings in the area.`;
      areaTerrainOptions.replaceChildren();
      for (const terrain of TERRAIN_AREA_OPTIONS) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = terrain.name;
        button.addEventListener("click", () => applyAreaTerrain(terrain.id));
        areaTerrainOptions.append(button);
      }
      areaTerrainDialog?.removeAttribute("hidden");
    }

    function applyAreaTerrain(terrainId) {
      const result = editor.paintTerrainArea(areaDeleteBounds, terrainId);
      areaTerrainMode = false;
      areaDeleteStart = null;
      areaDeleteBounds = null;
      renderer?.setAreaDeletePreview(null);
      areaTerrainDialog?.setAttribute("hidden", "");
      updateAreaDeleteButton();
      syncEditor();
      saveDraft();
      setStatus(`Filled area with ${terrainId}${result.removedBuildings.length ? ` and removed ${result.removedBuildings.length} building(s)` : ""}.`);
    }

    function applyAreaZone() {
      const result = editor.paintZoneArea(areaDeleteBounds, activeZoneId);
      areaZoneMode = false;
      activeZoneId = null;
      areaDeleteStart = null;
      areaDeleteBounds = null;
      renderer?.setAreaDeletePreview(null);
      updateAreaDeleteButton();
      syncEditor();
      saveDraft();
      setStatus(result.placements.length ? `Placed ${result.placements.length} zone cell(s).${result.skippedCount ? ` Skipped ${result.skippedCount} occupied cell(s).` : ""}` : "No empty cells available for this zone.");
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
