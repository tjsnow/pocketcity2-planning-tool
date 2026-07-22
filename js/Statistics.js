/** Calculates read-only summary values from a plan editor state. */
export function calculatePlanStatistics({ width, height, placements, roads, terrain }, database) {
  const occupiedCells = new Set();
  for (const placement of placements) {
    const building = database.getById(placement.catalogItemId);
    if (!building) continue;
    const rotated = placement.rotation === 90 || placement.rotation === 270;
    const placementWidth = rotated ? building.size.height : building.size.width;
    const placementHeight = rotated ? building.size.width : building.size.height;
    for (let y = placement.y; y < placement.y + placementHeight; y += 1) {
      for (let x = placement.x; x < placement.x + placementWidth; x += 1) occupiedCells.add(`${x},${y}`);
    }
  }
  return {
    gridArea: width * height,
    buildingCount: placements.length,
    occupiedCells: occupiedCells.size,
    roadSegmentCount: roads.length,
    terrainCellCount: terrain.toCells().length,
  };
}
