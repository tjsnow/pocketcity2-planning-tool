/** Explicit extension registry for future static plugins. Plugins may contribute data and actions, never mutate core state directly. */
export class PluginRegistry {
  constructor() { this.catalogItems = new Map(); this.tools = new Map(); }

  registerCatalogItem(pluginId, item) {
    assertPluginId(pluginId); validateItem(item);
    const key = `${pluginId}:${item.id}`;
    if (this.catalogItems.has(key)) throw new Error(`Duplicate plugin catalog item: ${key}`);
    this.catalogItems.set(key, Object.freeze({ ...item, pluginId }));
    return key;
  }

  registerTool(pluginId, tool) {
    assertPluginId(pluginId);
    if (!tool || typeof tool.id !== "string" || tool.id.trim() === "" || typeof tool.label !== "string" || typeof tool.activate !== "function") throw new TypeError("Plugin tools require id, label, and activate.");
    const key = `${pluginId}:${tool.id}`;
    if (this.tools.has(key)) throw new Error(`Duplicate plugin tool: ${key}`);
    this.tools.set(key, Object.freeze({ ...tool, pluginId }));
    return key;
  }

  getCatalogItems() { return [...this.catalogItems.values()]; }
  getTools() { return [...this.tools.values()]; }
}

function assertPluginId(id) { if (typeof id !== "string" || id.trim() === "") throw new TypeError("Plugin ID must be a non-empty string."); }
function validateItem(item) { if (!item || typeof item.id !== "string" || item.id.trim() === "" || typeof item.name !== "string" || item.name.trim() === "") throw new TypeError("Plugin catalog items require id and name."); }
