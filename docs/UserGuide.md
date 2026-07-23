# Pocket City Planner User Guide

## Start a plan

Serve the repository from a static web server and open `index.html`. The default plan is a 64×64 grid. Use the grid selector for 40×40 or 72×72.

## Place buildings

Choose a colored category icon in the Toolbox, select an item, then click cells on the grid. The popup stays open while placing. Building cards can also be dragged onto the grid. Hover placed buildings to see their names and footprints. The catalog contains 161 items across zones, roads, nature, utilities, services, transport, recreation, education, resources, finance, landmarks, unique buildings, and mega projects.

To move a placed item, click it once to select it and open the Inspector, then drag from the selected item to a new cell. Invalid destinations are rejected using the same rules as keyboard and Inspector movement.

Zones are different from ordinary buildings: choose Residential, Commercial, or Industrial Zone, then drag across the desired rectangle. The planner fills available cells and leaves existing buildings and roads untouched.

Catalog cards use project-generated isometric icons. Items with special placement notes show their requirement in the inspector/catalog metadata; those constraints are planning guidance until the corresponding validation rule is implemented.

## Paint terrain

Open the Terrain category and choose Planted Tree, Water, Sand, Soil, Grass, Canal, Wild Tree, Mountains, Palm Tree, or Erase. Drag across cells to paint continuously.

## Paint roads

Open Roads and choose a road type. Roads fill their occupied cells, connect at intersections, and can cross any terrain. Use Bulldozer to remove roads or buildings; click a cell or drag across multiple cells as a brush. Terrain is protected from bulldozing.

## Warnings and layers

The Inspector shows planning warnings. Red markers identify buildings without utility access. Utility access requires an adjacent road, or a one-cell gap occupied by another building. Layer buttons control visibility without deleting data.

## Service effects

Select a placed service building to edit its level in the Inspector when upgrades are supported. Enable Settings → Area of effect and choose a service type to preview its coverage; the planner displays its clearly labeled estimate immediately. For local services, enter a planning radius in tiles to override the estimate. A building must have both a valid road connection and electricity, water, and sewage coverage. The Inspector warning list reports each missing service separately. Exact game radii are not publicly documented.

## Save and import

Save downloads a portable JSON plan. Open imports a JSON plan. Local drafts are stored automatically in browser storage; exported JSON is the durable backup.
