import { enablePanelResizing } from "./UI.js";
import { Renderer } from "./Renderer.js";
import { BuildingBrowser } from "./BuildingBrowser.js";
import { loadBuildingCatalog } from "./BuildingCatalog.js";
import { Inspector } from "./Inspector.js";

/**
 * Application composition root.
 * At this stage it only initializes the workspace layout controls.
 */
enablePanelResizing(document.querySelector(".app-shell"));

const canvas = document.querySelector("#planner-canvas");
if (canvas) {
  new Renderer(canvas);
}

const inspectorRoot = document.querySelector("#inspector-content");
const inspector = inspectorRoot ? new Inspector(inspectorRoot) : null;
const buildingBrowserRoot = document.querySelector(".building-browser");
if (buildingBrowserRoot) {
  initializeBuildingBrowser(buildingBrowserRoot, inspector);
}

async function initializeBuildingBrowser(root, activeInspector) {
  try {
    new BuildingBrowser(root, await loadBuildingCatalog(), (building) => activeInspector?.showBuilding(building));
  } catch {
    root.querySelector("#building-results")?.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "building-browser-message",
        textContent: "Building catalog is unavailable. Serve the project from a static web server and try again.",
      }),
    );
  }
}
