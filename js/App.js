import { enablePanelResizing } from "./UI.js";
import { Renderer } from "./Renderer.js";

/**
 * Application composition root.
 * At this stage it only initializes the workspace layout controls.
 */
enablePanelResizing(document.querySelector(".app-shell"));

const canvas = document.querySelector("#planner-canvas");
if (canvas) {
  new Renderer(canvas);
}
