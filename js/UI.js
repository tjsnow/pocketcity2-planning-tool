const SIZE_LIMITS = {
  ribbon: { property: "--ribbon-height", minimum: 44, maximum: 160, axis: "y", direction: 1 },
  toolbox: { property: "--toolbox-width", minimum: 180, maximum: 480, axis: "x", direction: 1 },
  inspector: { property: "--inspector-width", minimum: 220, maximum: 520, axis: "x", direction: -1 },
  status: { property: "--status-height", minimum: 24, maximum: 96, axis: "y", direction: -1 },
};

/** Enables resizing for the non-functional desktop shell panels. */
export function enablePanelResizing(appShell) {
  if (!appShell) return;

  appShell.querySelectorAll("[data-resize]").forEach((handle) => {
    const config = SIZE_LIMITS[handle.dataset.resize];
    if (!config) return;

    handle.addEventListener("pointerdown", (event) => beginPointerResize(event, appShell, handle, config));
    handle.addEventListener("keydown", (event) => resizeWithKeyboard(event, appShell, handle, config));
  });
}

function beginPointerResize(event, appShell, handle, config) {
  event.preventDefault();
  handle.setPointerCapture(event.pointerId);
  handle.classList.add("is-resizing");

  const initialCoordinate = coordinateFor(event, config.axis);
  const initialSize = currentSize(appShell, config.property);

  const move = (moveEvent) => {
    const offset = (coordinateFor(moveEvent, config.axis) - initialCoordinate) * config.direction;
    applySize(appShell, handle, config, initialSize + offset);
  };

  const finish = () => {
    handle.classList.remove("is-resizing");
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", finish);
    handle.removeEventListener("pointercancel", finish);
  };

  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
}

function resizeWithKeyboard(event, appShell, handle, config) {
  const keys = config.axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  if (!keys.includes(event.key)) return;

  event.preventDefault();
  const isPositive = event.key === "ArrowRight" || event.key === "ArrowDown";
  const step = event.shiftKey ? 24 : 8;
  applySize(appShell, handle, config, currentSize(appShell, config.property) + (isPositive ? step : -step) * config.direction);
}

function applySize(appShell, handle, config, requestedSize) {
  const size = Math.min(config.maximum, Math.max(config.minimum, requestedSize));
  appShell.style.setProperty(config.property, `${size}px`);
  handle.setAttribute("aria-valuenow", String(Math.round(size)));
}

function currentSize(appShell, property) {
  return Number.parseFloat(getComputedStyle(appShell).getPropertyValue(property));
}

function coordinateFor(event, axis) {
  return axis === "x" ? event.clientX : event.clientY;
}
