import { SATELLITE_PRODUCTS } from "./satellite-products";

export type TopicId =
  | "agriculture"
  | "disaster-intelligence"
  | "environmental-change"
  | "infrastructure-urban-change"
  | "water"
  | "energy";

export interface DatasetDefinition {
  id: string;
  topicId: TopicId;
  label: string;
  unit: string;
  parameter?: string;
  temporalResolution?: string;
  engine?: "earth-engine";
  defaultPeriod?: { start: string; end: string };
  coverage?: { start: string; end: string };
  setupRequired?: boolean;
  source: { name: string; url: string };
  description: string;
  limitations: string;
  available: boolean;
  reason?: string;
}

export interface TopicIndicator {
  /** Display title shown under the topic icon. */
  label: string;
  /** Dataset this indicator opens, when one is catalogued. */
  datasetId?: string;
  /** Plain-language note shown in Detailed info when "See more" is pressed. */
  summary: string;
}

export const TOPICS: {
  id: TopicId;
  label: string;
  description: string;
  indicators: TopicIndicator[];
  uses: string;
  limitations: string;
}[] = [
  {
    id: "agriculture",
    label: "Agriculture",
    description: "Explore weather and modelled soil conditions that can inform agricultural planning.",
    indicators: [
      { label: "Rainfall", datasetId: "rainfall", summary: "Daily corrected precipitation from NASA POWER at the regional reference point." },
      { label: "Soil Moisture", datasetId: "root-zone-wetness", summary: "Modelled root-zone soil wetness; a grid estimate, not a field measurement." },
      { label: "Air Temperature", datasetId: "air-temperature", summary: "Daily mean air temperature at 2 metres; not land-surface temperature." },
      { label: "Vegetation Greenness", datasetId: "agriculture-vegetation-index", summary: "NASA MODIS vegetation greenness in 16-day composites near the selected location." },
      { label: "Evapotranspiration", datasetId: "evapotranspiration", summary: "MODIS modelled water loss from soil and plants in 8-day composites." },
    ],
    uses: "Review recent rainfall and seasonal conditions alongside local crop and field observations.",
    limitations: "Gridded weather and modelled soil wetness do not measure conditions on an individual farm or crop yield.",
  },
  {
    id: "disaster-intelligence",
    label: "Disaster Intelligence",
    description: "Review flood, drought, heat and fire indicators and, when configured, recent satellite fire detections.",
    indicators: [
      { label: "Precipitation", datasetId: "disaster-rainfall", summary: "Rainfall as context for flood reports; it does not confirm flooding on its own." },
      { label: "Extreme Rainfall Frequency", datasetId: "extreme-rainfall-frequency", summary: "How often daily rainfall passes a heavy-rain threshold. A counted statistic, not a flood forecast, and not connected." },
      { label: "Flood Extent", datasetId: "flood-extent", summary: "Satellite-mapped flooded area. Cloud and tree cover hide water from some sensors, and no validated product is connected." },
      { label: "Drought Indicators", datasetId: "drought-indicators", summary: "Rainfall and soil-moisture indices used to flag dry conditions. EarthLens indicators are not official drought declarations, and none is connected." },
      { label: "Hot-day Frequency", datasetId: "hot-day-frequency", summary: "How often daily temperature passes a heat threshold. A counted statistic, not a health warning, and not connected." },
      { label: "Active Fire / Hotspots", datasetId: "fire-detections", summary: "VIIRS fire detections from NASA FIRMS; requires FIRMS_MAP_KEY and is not an official fire count." },
      { label: "Burned Area", datasetId: "burned-area", summary: "Area mapped as burned after a fire, distinct from active detections. No validated product is connected." },
    ],
    uses: "Use these indicators as context when checking official flood, drought and fire information, and identify recent satellite fire detections.",
    limitations: "These indicators do not confirm an incident. Satellite detections can miss fires and are not an official incident report.",
  },
  {
    id: "environmental-change",
    label: "Environmental Change",
    description: "Understand longer-term changes in tree cover, land cover, surface temperature and atmospheric haze.",
    indicators: [
      { label: "Vegetation indices", datasetId: "vegetation-index", summary: "NASA MODIS vegetation greenness in 16-day composites near the selected location." },
      { label: "Tree Cover", datasetId: "forest-cover", summary: "Share of ground covered by tree canopy. Distinct from legal forest extent." },
      { label: "Land Cover", datasetId: "land-cover", summary: "Mapped land-cover classes and their changes; no separate class-map product is connected." },
      { label: "Land-surface temperature", datasetId: "land-surface-temperature", summary: "MODIS clear-sky daytime surface temperature in 8-day composites." },
      { label: "Land-cover change", datasetId: "land-cover-change", summary: "Annual MODIS classification differences from the first selected year. Differences may include classification noise." },
      { label: "Aerosol Optical Depth", datasetId: "aerosol-optical-depth", summary: "How much sunlight airborne particles block, used as a haze and smoke indicator. Not a ground-level pollution measurement, and not connected." },
    ],
    uses: "Compare consistent satellite observations over time when a validated data product is connected.",
    limitations: "Satellite products have different publication schedules, spatial resolutions and quality masks. Classification differences do not establish land conversion. Aerosol optical depth is not a ground-level pollution measurement.",
  },
  {
    id: "infrastructure-urban-change",
    label: "Infrastructure and Urban Change",
    description: "Explore built-up extent, urban greenery and urban heat using suitable satellite products.",
    indicators: [
      { label: "Built-up area", datasetId: "built-up-area", summary: "Share of MODIS pixels classified as urban or built-up, averaged across the selected boundary." },
      { label: "Settlement expansion", datasetId: "settlement-expansion", summary: "Difference in urban-class cover from the first selected year; classification changes do not confirm construction." },
      { label: "Land-use change", datasetId: "land-use-change", summary: "Cropland-cover differences as an agricultural land-cover proxy, not observed land use or zoning." },
      { label: "Urban Vegetation", datasetId: "urban-vegetation", summary: "Greenness inside built-up areas, such as parks and street trees. No validated product is connected." },
      { label: "Urban Surface Temperature", datasetId: "urban-surface-temperature", summary: "Satellite land-surface temperature over built-up areas, used to look at urban heat. No validated product is connected." },
    ],
    uses: "Compare built-up extent, urban greenery and surface heat over time when a validated spatial dataset is available.",
    limitations: "MODIS 500 m classifications miss small settlements. Cropland is a land-use proxy; urban vegetation and urban surface temperature are not yet connected.",
  },
  {
    id: "water",
    label: "Water",
    description: "Review river and surface-water indicators for water availability and seasonal conditions.",
    indicators: [
      { label: "Precipitation", datasetId: "water-rainfall", summary: "Rainfall as climate context for water availability; not river flow or storage." },
      { label: "Surface-water extent", datasetId: "water-extent", summary: "Monthly Landsat-derived surface-water cover from the JRC archive (1984–2021)." },
      { label: "Seasonal water changes", datasetId: "seasonal-water-change", summary: "Monthly water-cover observations can be compared across seasons. This historical archive ends in 2021." },
      { label: "River Discharge / Flow", datasetId: "river-discharge", summary: "Volume of water passing a river cross-section over time. No validated discharge series is connected." },
      { label: "River Water Surface Elevation", datasetId: "river-water-surface-elevation", summary: "Height of the river surface above a reference datum. No validated elevation series is connected." },
      { label: "River Width", datasetId: "river-width", summary: "Distance bank to bank along a river reach. No validated width series is connected." },
      { label: "River Surface Slope", datasetId: "river-surface-slope", summary: "Fall in water-surface height along a river reach, used with width and elevation to estimate flow. Not connected." },
      { label: "Surface Water Area", datasetId: "surface-water-area", summary: "Area covered by surface water, including seasonal change. No validated product is connected." },
      { label: "Reservoir Surface Area", datasetId: "reservoir-surface-area", summary: "Water-surface area of reservoirs, a proxy for stored volume. No validated product is connected." },
    ],
    uses: "Compare river flow, level, width and surface-water area over time alongside river gauges, reservoirs and local reports.",
    limitations: "Water-cover observations are historical (through 2021), and do not measure river flow or confirm current flooding. River level, width, slope, discharge and reservoir products are not connected.",
  },
  {
    id: "energy",
    label: "Energy and electricity",
    description: "Explore night-lighting, solar-resource and wind-speed observations that can inform energy assessment.",
    indicators: [
      { label: "Solar radiation", datasetId: "solar-radiation", summary: "Daily all-sky surface shortwave radiation; context for screening, not a site assessment." },
      { label: "Wind speed", datasetId: "wind-speed", summary: "Daily wind speed at 10 metres; not turbine-height wind." },
      { label: "Nighttime lights", datasetId: "nighttime-lights", summary: "Monthly VIIRS nighttime radiance over valid cloud-free observations; not a measure of electricity supply." },
      { label: "Nighttime Brightness", datasetId: "nighttime-lights", summary: "Satellite radiance from lights at night. A proxy for lighting, not a measure of electricity supply." },
      { label: "Lit Area", datasetId: "lit-area", summary: "Area lit above a brightness threshold at night, used to track electrified extent. No validated product is connected." },
    ],
    uses: "Use solar radiation and wind speed as environmental context for screening renewable-energy potential.",
    limitations: "Night-lighting does not directly measure electricity supply. Point observations are not a site assessment.",
  },
];

export const DATASETS: DatasetDefinition[] = [
  {
    id: "agriculture-vegetation-index",
    topicId: "agriculture",
    label: "Vegetation index",
    unit: "index",
    source: { name: "NASA MODIS MOD13Q1 via ORNL DAAC", url: "https://modis.ornl.gov/data/modis_webservice.html" },
    description: "Vegetation greenness (NDVI), 16-day composites",
    temporalResolution: "16-day composites",
    limitations: "Mean of valid-range pixels within about 1 km of the reference point, not a township average. Cloud contamination may remain; detailed quality flags are not applied. Not crop yield. Choose up to one year.",
    available: true,
  },
  {
    id: "vegetation-index",
    topicId: "environmental-change",
    label: "Vegetation index",
    unit: "index",
    source: { name: "NASA MODIS MOD13Q1 via ORNL DAAC", url: "https://modis.ornl.gov/data/modis_webservice.html" },
    description: "Vegetation greenness (NDVI), 16-day composites",
    temporalResolution: "16-day composites",
    limitations: "Mean of valid-range pixels within about 1 km of the reference point, not a township average. Cloud contamination may remain; detailed quality flags are not applied. Choose up to one year.",
    available: true,
  },
  {
    id: "land-cover",
    topicId: "environmental-change",
    label: "Land cover",
    unit: "class",
    source: { name: "Not connected", url: "" },
    description: "Land-cover classes such as forest, cropland, water and built-up",
    limitations: "No separate validated land-cover class-map product is connected; land-cover change is available as a comparison metric.",
    available: false,
    reason: "No land-cover class-map service is connected.",
  },
  {
    id: "aerosol-optical-depth",
    topicId: "environmental-change",
    label: "Aerosol optical depth",
    unit: "index",
    source: { name: "Not connected", url: "" },
    description: "Column aerosol optical depth",
    limitations: "Aerosol optical depth is a whole-column measure of haze, not ground-level particulate concentration.",
    available: false,
    reason: "No aerosol data service is connected.",
  },
  {
    id: "urban-vegetation",
    topicId: "infrastructure-urban-change",
    label: "Urban vegetation",
    unit: "index",
    source: { name: "Not connected", url: "" },
    description: "Vegetation greenness within built-up areas",
    limitations: "No validated urban-vegetation product is connected.",
    available: false,
    reason: "No urban-vegetation data service is connected.",
  },
  {
    id: "urban-surface-temperature",
    topicId: "infrastructure-urban-change",
    label: "Urban surface temperature",
    unit: "°C",
    source: { name: "Not connected", url: "" },
    description: "Satellite land-surface temperature over built-up areas",
    limitations: "Land-surface temperature is not near-surface air temperature, and no validated urban product is connected.",
    available: false,
    reason: "No urban surface-temperature data service is connected.",
  },
  {
    id: "river-discharge",
    topicId: "water",
    label: "River discharge / flow",
    unit: "m³/s",
    source: { name: "Not connected", url: "" },
    description: "River discharge at a reach",
    limitations: "No validated river-discharge series is connected.",
    available: false,
    reason: "No river-discharge data service is connected.",
  },
  {
    id: "river-water-surface-elevation",
    topicId: "water",
    label: "River water surface elevation",
    unit: "m",
    source: { name: "Not connected", url: "" },
    description: "Water-surface height above a reference datum",
    limitations: "No validated water-surface-elevation series is connected.",
    available: false,
    reason: "No water-surface-elevation data service is connected.",
  },
  {
    id: "river-width",
    topicId: "water",
    label: "River width",
    unit: "m",
    source: { name: "Not connected", url: "" },
    description: "Bank-to-bank river width",
    limitations: "No validated river-width series is connected.",
    available: false,
    reason: "No river-width data service is connected.",
  },
  {
    id: "river-surface-slope",
    topicId: "water",
    label: "River surface slope",
    unit: "cm/km",
    source: { name: "Not connected", url: "" },
    description: "Water-surface slope along a river reach",
    limitations: "No validated river-slope series is connected.",
    available: false,
    reason: "No river-slope data service is connected.",
  },
  {
    id: "surface-water-area",
    topicId: "water",
    label: "Surface water area",
    unit: "km²",
    source: { name: "Not connected", url: "" },
    description: "Area covered by surface water",
    limitations: "No validated surface-water area product is connected.",
    available: false,
    reason: "No surface-water area data service is connected.",
  },
  {
    id: "reservoir-surface-area",
    topicId: "water",
    label: "Reservoir surface area",
    unit: "km²",
    source: { name: "Not connected", url: "" },
    description: "Water-surface area of reservoirs",
    limitations: "Surface area is a proxy for storage, not a measured volume, and no validated product is connected.",
    available: false,
    reason: "No reservoir-area data service is connected.",
  },
  {
    id: "lit-area",
    topicId: "energy",
    label: "Lit area",
    unit: "km²",
    source: { name: "Not connected", url: "" },
    description: "Area lit above a night-brightness threshold",
    limitations: "Lit area depends on the chosen brightness threshold and does not confirm grid connection.",
    available: false,
    reason: "No lit-area data service is connected.",
  },
  {
    id: "extreme-rainfall-frequency",
    topicId: "disaster-intelligence",
    label: "Extreme rainfall frequency",
    unit: "days",
    source: { name: "Not connected", url: "" },
    description: "Count of days above a heavy-rain threshold",
    limitations: "A counted statistic over a chosen threshold, not a flood forecast.",
    available: false,
    reason: "No extreme-rainfall statistic is connected.",
  },
  {
    id: "flood-extent",
    topicId: "disaster-intelligence",
    label: "Flood extent",
    unit: "km²",
    source: { name: "Not connected", url: "" },
    description: "Satellite-mapped flooded area",
    limitations: "Cloud and tree cover hide standing water from some sensors; no validated flood product is connected.",
    available: false,
    reason: "No flood-extent data service is connected.",
  },
  {
    id: "drought-indicators",
    topicId: "disaster-intelligence",
    label: "Drought indicators",
    unit: "index",
    source: { name: "Not connected", url: "" },
    description: "Rainfall and soil-moisture drought indices",
    limitations: "EarthLens indicators are not official drought declarations.",
    available: false,
    reason: "No drought-index data service is connected.",
  },
  {
    id: "hot-day-frequency",
    topicId: "disaster-intelligence",
    label: "Hot-day frequency",
    unit: "days",
    source: { name: "Not connected", url: "" },
    description: "Count of days above a heat threshold",
    limitations: "A counted statistic over a chosen threshold, not a health warning.",
    available: false,
    reason: "No hot-day statistic is connected.",
  },
  {
    id: "burned-area",
    topicId: "disaster-intelligence",
    label: "Burned area",
    unit: "km²",
    source: { name: "Not connected", url: "" },
    description: "Area mapped as burned after a fire",
    limitations: "Burned area is mapped after an event and is distinct from active fire detections.",
    available: false,
    reason: "No burned-area data service is connected.",
  },
  ...Object.entries(SATELLITE_PRODUCTS).map(([id, product]): DatasetDefinition => ({
    id,
    topicId: id === "evapotranspiration" ? "agriculture" : id === "nighttime-lights" ? "energy" : ["water-extent", "seasonal-water-change"].includes(id) ? "water" : ["built-up-area", "settlement-expansion", "land-use-change"].includes(id) ? "infrastructure-urban-change" : "environmental-change",
    label: product.label,
    unit: product.unit,
    engine: "earth-engine",
    temporalResolution: product.cadence,
    defaultPeriod: { start: product.defaultStart, end: product.defaultEnd },
    coverage: { start: product.start, end: product.end },
    source: { name: `${product.collection} via Google Earth Engine`, url: `https://developers.google.com/earth-engine/datasets/catalog/${product.collection.replaceAll("/", "_")}` },
    description: product.label,
    limitations: product.limitations,
    available: true,
  })),
  {
    id: "rainfall",
    topicId: "agriculture",
    label: "Corrected precipitation",
    unit: "mm/day",
    parameter: "PRECTOTCORR",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Daily corrected precipitation",
    limitations: "Precipitation is a gridded estimate at one representative point, not a township-wide average.",
    available: true,
  },
  {
    id: "air-temperature",
    topicId: "agriculture",
    label: "Near-surface air temperature",
    unit: "°C",
    parameter: "T2M",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Daily mean air temperature at 2 metres",
    limitations: "Air temperature is not land-surface temperature and does not represent every field.",
    available: true,
  },
  {
    id: "root-zone-wetness",
    topicId: "agriculture",
    label: "Root-zone soil wetness",
    unit: "fraction (0–1)",
    parameter: "GWETROOT",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Modelled root-zone soil wetness",
    limitations: "This is a modelled grid estimate, not direct field or satellite soil-moisture measurement.",
    available: true,
  },
  {
    id: "disaster-rainfall",
    topicId: "disaster-intelligence",
    label: "Corrected precipitation",
    unit: "mm/day",
    parameter: "PRECTOTCORR",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Daily corrected precipitation",
    limitations: "Rainfall alone does not confirm flooding; river levels and official warnings are not included.",
    available: true,
  },
  {
    id: "fire-detections",
    topicId: "disaster-intelligence",
    label: "Satellite fire detections",
    unit: "detections/day",
    source: { name: "NASA FIRMS NOAA-20 VIIRS (public seven-day feed)", url: "https://firms.modaps.eosdis.nasa.gov/active_fire/" },
    description: "Daily VIIRS satellite fire detections",
    limitations: "Detections are not an official fire count; satellite overpass, cloud and confidence affect coverage.",
    available: true,
  },
  {
    id: "water-rainfall",
    topicId: "water",
    label: "Corrected precipitation",
    unit: "mm/day",
    parameter: "PRECTOTCORR",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Daily corrected precipitation",
    limitations: "Precipitation is not surface-water extent, river flow or reservoir storage.",
    available: true,
  },
  {
    id: "solar-radiation",
    topicId: "energy",
    label: "All-sky solar radiation",
    unit: "MJ/m²/day",
    parameter: "ALLSKY_SFC_SW_DWN",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Daily all-sky surface shortwave downward radiation",
    limitations: "A regional reference point is not a solar-site assessment or electricity-generation measurement.",
    available: true,
  },
  {
    id: "wind-speed",
    topicId: "energy",
    label: "Wind speed at 10 m",
    unit: "m/s",
    parameter: "WS10M",
    source: { name: "NASA POWER Daily API", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" },
    description: "Daily wind speed at 10 metres",
    limitations: "A regional reference point does not describe turbine-height wind or site-level energy potential.",
    available: true,
  },
];
