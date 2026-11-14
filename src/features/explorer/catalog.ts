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
      { label: "Vegetation Greenness", datasetId: "agriculture-vegetation-index", summary: "Satellite vegetation index. No validated series is connected in this workspace." },
      { label: "Evapotranspiration", summary: "Water lost from soil and plants. No evapotranspiration product is connected in this workspace." },
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
      { label: "Satellite fire detections", datasetId: "fire-detections", summary: "VIIRS fire detections from NASA FIRMS; requires FIRMS_MAP_KEY and is not an official fire count." },
    ],
    uses: "Use rainfall as context when checking official flood information and identify recent satellite fire detections.",
    limitations: "Rainfall alone does not confirm flooding. Satellite detections can miss fires and are not an official incident report.",
  },
  {
    id: "environmental-change",
    label: "Environmental Change",
    description: "Understand longer-term changes in vegetation, land cover and surface conditions.",
    indicators: [
      { label: "Vegetation indices", datasetId: "vegetation-index", summary: "Satellite greenness over time. No validated series is connected in this workspace." },
      { label: "Forest cover", datasetId: "forest-cover", summary: "Forest extent and loss. No validated forest-cover series is connected." },
      { label: "Land-surface temperature", datasetId: "land-surface-temperature", summary: "Satellite surface temperature; distinct from near-surface air temperature. Not connected." },
      { label: "Land-cover change", datasetId: "land-cover-change", summary: "Land-cover classes and their change over time. Not connected." },
    ],
    uses: "Compare consistent satellite observations over time when a validated data product is connected.",
    limitations: "No vegetation, forest-cover, land-cover or land-surface-temperature series is connected in this workspace.",
  },
  {
    id: "infrastructure-urban-change",
    label: "Infrastructure and Urban Change",
    description: "Explore settlement growth and land-use change using suitable satellite products.",
    indicators: [
      { label: "Built-up area", datasetId: "built-up-area", summary: "Mapped built-up footprint. No validated series is connected in this workspace." },
      { label: "Settlement expansion", datasetId: "settlement-expansion", summary: "Settlement footprint over time. No validated series is connected." },
      { label: "Land-use change", datasetId: "land-use-change", summary: "Mapped land-use classes and change. No validated product is connected." },
    ],
    uses: "Compare mapped built-up footprints over time when a validated spatial dataset is available.",
    limitations: "No built-up area, settlement or land-use change dataset is connected in this workspace.",
  },
  {
    id: "water",
    label: "Water",
    description: "Review precipitation context for water availability and seasonal conditions.",
    indicators: [
      { label: "Precipitation", datasetId: "water-rainfall", summary: "Rainfall as climate context for water availability; not river flow or storage." },
      { label: "Surface-water extent", datasetId: "water-extent", summary: "Satellite surface-water extent. No surface-water dataset is connected." },
      { label: "Seasonal water changes", datasetId: "seasonal-water-change", summary: "Seasonal change in surface water. No validated dataset is connected." },
    ],
    uses: "Use precipitation as climate context alongside river gauges, reservoirs and local reports.",
    limitations: "Precipitation is not surface-water extent or river flow; no surface-water dataset is connected.",
  },
  {
    id: "energy",
    label: "Energy and electricity",
    description: "Explore solar-resource and wind-speed observations that can inform energy assessment.",
    indicators: [
      { label: "Solar radiation", datasetId: "solar-radiation", summary: "Daily all-sky surface shortwave radiation; context for screening, not a site assessment." },
      { label: "Wind speed", datasetId: "wind-speed", summary: "Daily wind speed at 10 metres; not turbine-height wind." },
      { label: "Nighttime lights", datasetId: "nighttime-lights", summary: "Satellite nighttime radiance. Not a measure of electricity supply, and not connected." },
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
    source: { name: "Not connected", url: "" },
    description: "Satellite vegetation index",
    limitations: "No validated vegetation-index time series is connected.",
    available: false,
    reason: "No vegetation-index data service is connected.",
  },
  {
    id: "vegetation-index",
    topicId: "environmental-change",
    label: "Vegetation index",
    unit: "index",
    source: { name: "Not connected", url: "" },
    description: "Satellite vegetation index",
    limitations: "No validated vegetation-index time series is connected.",
    available: false,
    reason: "No vegetation-index data service is connected.",
  },
  {
    id: "forest-cover",
    topicId: "environmental-change",
    label: "Forest cover",
    unit: "%",
    source: { name: "Not connected", url: "" },
    description: "Forest-cover extent",
    limitations: "No validated forest-cover time series is connected.",
    available: false,
    reason: "No forest-cover data service is connected.",
  },
  {
    id: "land-surface-temperature",
    topicId: "environmental-change",
    label: "Land-surface temperature",
    unit: "°C",
    source: { name: "Not connected", url: "" },
    description: "Satellite land-surface temperature",
    limitations: "NASA POWER near-surface air temperature is not land-surface temperature.",
    available: false,
    reason: "No land-surface-temperature data service is connected.",
  },
  {
    id: "land-cover-change",
    topicId: "environmental-change",
    label: "Land-cover change",
    unit: "class",
    source: { name: "Not connected", url: "" },
    description: "Land-cover classes and change",
    limitations: "No validated land-cover-change product is connected.",
    available: false,
    reason: "No land-cover data service is connected.",
  },
  {
    id: "built-up-area",
    topicId: "infrastructure-urban-change",
    label: "Built-up area",
    unit: "area",
    source: { name: "Not connected", url: "" },
    description: "Mapped built-up footprint",
    limitations: "No validated built-up-area time series is connected.",
    available: false,
    reason: "No built-up-area data service is connected.",
  },
  {
    id: "settlement-expansion",
    topicId: "infrastructure-urban-change",
    label: "Settlement expansion",
    unit: "area",
    source: { name: "Not connected", url: "" },
    description: "Settlement footprint over time",
    limitations: "No validated settlement-expansion product is connected.",
    available: false,
    reason: "No settlement-expansion data service is connected.",
  },
  {
    id: "land-use-change",
    topicId: "infrastructure-urban-change",
    label: "Land-use change",
    unit: "class",
    source: { name: "Not connected", url: "" },
    description: "Mapped land-use classes and change",
    limitations: "No validated land-use-change product is connected.",
    available: false,
    reason: "No land-use-change data service is connected.",
  },
  {
    id: "water-extent",
    topicId: "water",
    label: "Surface-water extent",
    unit: "area",
    source: { name: "Not connected", url: "" },
    description: "Satellite surface-water extent",
    limitations: "No surface-water extent or river-flow series is connected.",
    available: false,
    reason: "No surface-water data service is connected.",
  },
  {
    id: "seasonal-water-change",
    topicId: "water",
    label: "Seasonal water changes",
    unit: "area",
    source: { name: "Not connected", url: "" },
    description: "Seasonal surface-water changes",
    limitations: "No validated seasonal surface-water dataset is connected.",
    available: false,
    reason: "No seasonal water-change data service is connected.",
  },
  {
    id: "nighttime-lights",
    topicId: "energy",
    label: "Nighttime lights",
    unit: "radiance",
    source: { name: "Not connected", url: "" },
    description: "Satellite nighttime-light radiance",
    limitations: "Nighttime lights do not directly measure electricity supply.",
    available: false,
    reason: "No nighttime-lights data service is connected.",
  },
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
    source: { name: "NASA FIRMS VIIRS S-NPP", url: "https://firms.modaps.eosdis.nasa.gov/api/area/" },
    description: "Daily VIIRS satellite fire detections",
    limitations: "Detections are not an official fire count; satellite overpass, cloud and confidence affect coverage.",
    available: false,
    reason: "Configure FIRMS_MAP_KEY to enable this dataset.",
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
