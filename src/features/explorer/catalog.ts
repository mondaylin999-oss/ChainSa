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
    description: "Review selected weather indicators and, when configured, recent satellite fire detections.",
    indicators: [
      { label: "Precipitation", datasetId: "disaster-rainfall", summary: "Rainfall as context for flood reports; it does not confirm flooding on its own." },
      { label: "Satellite fire detections", datasetId: "fire-detections", summary: "NOAA-20 VIIRS detections from the public NASA FIRMS seven-day feed, filtered to the selected boundary." },
    ],
    uses: "Use rainfall as context when checking official flood information and identify recent satellite fire detections.",
    limitations: "Rainfall alone does not confirm flooding. Satellite detections can miss fires and are not an official incident report.",
  },
  {
    id: "environmental-change",
    label: "Environmental Change",
    description: "Understand longer-term changes in vegetation, land cover and surface conditions.",
    indicators: [
      { label: "Vegetation indices", datasetId: "vegetation-index", summary: "NASA MODIS vegetation greenness in 16-day composites near the selected location." },
      { label: "Forest cover", datasetId: "forest-cover", summary: "Annual MODIS tree canopy percentage across the selected boundary. Tree canopy is distinct from legal forest extent." },
      { label: "Land-surface temperature", datasetId: "land-surface-temperature", summary: "MODIS clear-sky daytime surface temperature in 8-day composites." },
      { label: "Land-cover change", datasetId: "land-cover-change", summary: "Annual MODIS classification differences from the first selected year. Differences may include classification noise." },
    ],
    uses: "Compare consistent satellite observations over time when a validated data product is connected.",
    limitations: "Satellite products have different publication schedules, spatial resolutions and quality masks. Classification differences do not establish land conversion.",
  },
  {
    id: "infrastructure-urban-change",
    label: "Infrastructure and Urban Change",
    description: "Explore settlement growth and land-use change using suitable satellite products.",
    indicators: [
      { label: "Built-up area", datasetId: "built-up-area", summary: "Share of MODIS pixels classified as urban or built-up, averaged across the selected boundary." },
      { label: "Settlement expansion", datasetId: "settlement-expansion", summary: "Difference in urban-class cover from the first selected year; classification changes do not confirm construction." },
      { label: "Land-use change", datasetId: "land-use-change", summary: "Cropland-cover differences as an agricultural land-cover proxy, not observed land use or zoning." },
    ],
    uses: "Compare mapped built-up footprints over time when a validated spatial dataset is available.",
    limitations: "MODIS 500 m classifications miss small settlements. Cropland is a land-use proxy, and classification differences require local validation.",
  },
  {
    id: "water",
    label: "Water",
    description: "Review precipitation context for water availability and seasonal conditions.",
    indicators: [
      { label: "Precipitation", datasetId: "water-rainfall", summary: "Rainfall as climate context for water availability; not river flow or storage." },
      { label: "Surface-water extent", datasetId: "water-extent", summary: "Monthly Landsat-derived surface-water cover from the JRC archive (1984–2021)." },
      { label: "Seasonal water changes", datasetId: "seasonal-water-change", summary: "Monthly water-cover observations can be compared across seasons. This historical archive ends in 2021." },
    ],
    uses: "Use precipitation as climate context alongside river gauges, reservoirs and local reports.",
    limitations: "Water-cover observations are historical (through 2021), and do not measure river flow or confirm current flooding.",
  },
  {
    id: "energy",
    label: "Energy and electricity",
    description: "Explore solar-resource and wind-speed observations that can inform energy assessment.",
    indicators: [
      { label: "Solar radiation", datasetId: "solar-radiation", summary: "Daily all-sky surface shortwave radiation; context for screening, not a site assessment." },
      { label: "Wind speed", datasetId: "wind-speed", summary: "Daily wind speed at 10 metres; not turbine-height wind." },
      { label: "Nighttime lights", datasetId: "nighttime-lights", summary: "Monthly VIIRS nighttime radiance over valid cloud-free observations; not a measure of electricity supply." },
    ],
    uses: "Use solar radiation and wind speed as environmental context for screening renewable-energy potential.",
    limitations: "Nighttime lights do not directly measure electricity supply. Point observations are not a site assessment.",
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
    limitations: "Mean of valid-range pixels within about 1 km of the reference point, not a township average. Cloud contamination may remain; detailed quality flags are not applied. Not crop yield. Choose up to one year.",
    available: true,
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
