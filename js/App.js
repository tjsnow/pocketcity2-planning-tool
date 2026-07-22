import { enablePanelResizing } from "./UI.js";

/**
 * Application composition root.
 * At this stage it only initializes the workspace layout controls.
 */
enablePanelResizing(document.querySelector(".app-shell"));
