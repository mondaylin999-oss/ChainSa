# Township map boundaries

The map draws national township outlines from the MIMU Myanmar Township Boundaries layer (Admin 3, PCode 9.4). The checked-in GeoJSON is a static snapshot in `public/township-boundaries.geojson`; its 330 township PCodes match the project’s MIMU PCode 9.7 township directory.

MIMU says these administrative boundaries come from the General Administration Department and are mapped at approximately 1:250,000. MIMU products may be used free of charge with attribution. The source and version are also included in the GeoJSON metadata and the map attribution.

## Map behavior

- Township outlines appear over the state and region boundaries.
- Hovering or tapping a township shows its name. Clicking a township highlights it, selects its state or region, and zooms to the selected township.
- The location selector remains available for keyboard users.
- NASA POWER measurements still use the state or region representative point. Selecting a township only highlights the boundary; it does not provide township-level measurements.

## Sources

- [MIMU Myanmar Administrative Boundary dataset](https://data.themimu.info/en/dataset/myanmar-administrative-boundary)
- [MIMU Myanmar Township Boundaries layer](https://geonode.themimu.info/layers/geonode%3Ammr_polbnda_adm3_250k_mimu_1)
- Township names and PCodes: MIMU PCode release 9.7, January 2026, in `public/townships.json`.
