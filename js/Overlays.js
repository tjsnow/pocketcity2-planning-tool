/** Ordered registry for transient Canvas overlay draw callbacks. */
export class OverlayRegistry {
  constructor(overlays = []) {
    this.overlays = new Map();
    for (const overlay of overlays) this.add(overlay);
  }

  add(overlay) {
    validateOverlay(overlay);
    if (this.overlays.has(overlay.id)) {
      throw new Error(`Duplicate overlay ID: ${overlay.id}`);
    }
    this.overlays.set(overlay.id, { ...overlay, visible: overlay.visible ?? true, zIndex: overlay.zIndex ?? 0 });
  }

  remove(id) {
    return this.overlays.delete(id);
  }

  setVisible(id, visible) {
    const overlay = this.overlays.get(id);
    if (!overlay) return false;
    overlay.visible = Boolean(visible);
    return true;
  }

  draw(context, camera, viewportWidth, viewportHeight) {
    const ordered = [...this.overlays.values()].sort((left, right) => left.zIndex - right.zIndex);
    for (const overlay of ordered) {
      if (overlay.visible) overlay.draw(context, camera, viewportWidth, viewportHeight);
    }
  }
}

function validateOverlay(overlay) {
  if (!overlay || typeof overlay !== "object") throw new TypeError("Overlay must be an object.");
  if (typeof overlay.id !== "string" || overlay.id.trim().length === 0) {
    throw new TypeError("Overlay ID must be a non-empty string.");
  }
  if (typeof overlay.draw !== "function") throw new TypeError("Overlay draw must be a function.");
  if (overlay.zIndex !== undefined && !Number.isFinite(overlay.zIndex)) {
    throw new TypeError("Overlay zIndex must be a finite number.");
  }
}
