import { createBuildingDatabase } from "./Buildings.js";

const CATALOG_URL = new URL("../data/buildings.json", import.meta.url);

/** Loads and validates the static building catalog without involving UI state. */
export async function loadBuildingCatalog(url = CATALOG_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Building catalog could not be loaded (${response.status}).`);
  }

  return createBuildingDatabase(await response.json());
}
