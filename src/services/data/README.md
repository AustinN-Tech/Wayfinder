The offline World Traveler lookup uses Natural Earth v5.1.2, public-domain data.

`world_regions.json` contains geometry from:

- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_geography_regions_polys.geojson
  (Continent, Island, and Island group features; REGION becomes continent.)
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_land.geojson
  (Land geometry prevents ocean locations inside broad island regions from counting.)

License: https://www.naturalearthdata.com/about/terms-of-use/

Seven regions are counted: Africa, Antarctica, Asia, Europe, North America,
South America, and Oceania (including Australia and Pacific islands).
Geographic region polygons distinguish Europe/Asia without assigning all of
Russia to one continent. They also classify overseas discoveries by location.

These are generalized maps, not survey boundaries. Tiny islands and coastal or
border locations can be unresolved or approximate. Missing, non-finite,
out-of-range, ocean, and unresolved points do not add progress. No network call
is made during evaluation; keep this JSON file in deployments.
