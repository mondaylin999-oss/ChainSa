/** Public product definitions are also used to explain coverage before a request. */
export type SatelliteMetric = "tree-cover" | "lst" | "land-change" | "built-up" | "built-change" | "crop-change" | "water" | "lights" | "et" | "urban-ndvi" | "urban-lst" | "burned";
export interface SatelliteProduct {
  collection: string;
  band: string;
  metric: SatelliteMetric;
  scale: number;
  cadence: string;
  start: string;
  end: string;
  defaultStart: string;
  defaultEnd: string;
  unit: string;
  label: string;
  limitations: string;
  /** Full citation shown in the UI when the collection ID alone is not enough (e.g. a NASA product masked by another NASA product). */
  sourceName?: string;
  sourceUrl?: string;
  /**
   * True only when the archive has genuinely ended. Otherwise `end` is just the latest release known when this
   * was written: newer observations are accepted, and NASA's published date list decides what exists.
   */
  fixedArchive?: boolean;
}

/** NASA MCD12Q1 v061 land cover (IGBP class 13 = urban and built-up), used to restrict urban indicators to built-up pixels. */
export const URBAN_MASK = { collection: "MODIS/061/MCD12Q1", band: "LC_Type1", urbanClass: 13, firstYear: 2001, scale: 500 } as const;
/**
 * Land-cover year applied to an observation: the latest published MCD12Q1 year not after the observation year
 * (or the first year for earlier observations). `availableYears` comes from NASA's published date list.
 */
export function urbanMaskYear(date: string, availableYears: number[]) {
  const year = Number(date.slice(0, 4));
  const sorted = [...availableYears].sort((a, b) => a - b);
  if (!sorted.length) throw new Error("NASA did not list any published MCD12Q1 land-cover years for this location.");
  return [...sorted].reverse().find(y => y <= year) ?? sorted[0];
}
const URBAN_MASK_NOTE = `Built-up pixels are taken from NASA MODIS MCD12Q1 v061 land cover (IGBP class 13, 500 m) for the same year; observations after the latest published land-cover year use that latest map. MODIS 500 m classification misses small settlements, so towns without mapped urban pixels return no value rather than a rural substitute.`;
const annual = { collection: "MODIS/061/MCD12Q1", band: "LC_Type1", scale: 500, cadence: "Annual", start: "2001-01-01", end: "2024-12-31", defaultStart: "2020-01-01", defaultEnd: "2024-12-31" };
const water = { collection: "JRC/GSW1_4/MonthlyHistory", band: "water", metric: "water" as const, fixedArchive: true, scale: 30, cadence: "Monthly", start: "1984-03-01", end: "2021-12-31", defaultStart: "2019-01-01", defaultEnd: "2021-12-31", unit: "% observed area", label: "Observed surface-water cover", limitations: "Not a NASA dataset: European Commission Joint Research Centre Global Surface Water (Landsat-based), kept because NASA offers no freely served equivalent for 1984–2021. Monthly water share of valid observed pixels. Unobserved pixels are excluded. This historical product ends in 2021; it is not current flood detection or river flow. For NASA-based recent water area, use Surface Water Area (MODIS) or the SWOT indicators.", sourceName: "European Commission JRC Global Surface Water v1.4 (non-NASA)" };
export const SATELLITE_PRODUCTS: Record<string, SatelliteProduct> = {
  "forest-cover": { collection: "MODIS/061/MOD44B", band: "Percent_Tree_Cover", metric: "tree-cover", scale: 250, cadence: "Annual", start: "2000-03-05", end: "2024-12-31", defaultStart: "2020-01-01", defaultEnd: "2024-12-31", unit: "% tree canopy", label: "Tree canopy cover", limitations: "Tree canopy percentage is not a legal forest designation or a deforestation measurement. Water and invalid pixels are excluded; detailed cloud flags are not applied." },
  "land-surface-temperature": { collection: "MODIS/061/MOD11A2", band: "LST_Day_1km", metric: "lst", scale: 1000, cadence: "8-day composites", start: "2000-02-18", end: "2025-12-31", defaultStart: "2025-01-01", defaultEnd: "2025-12-31", unit: "°C", label: "Daytime land-surface temperature", limitations: "Clear-sky daytime surface temperature, distinct from air temperature. Only good-quality retrievals with estimated LST error at most 1 K are used. Cloudy areas may have no observations." },
  "land-cover-change": { ...annual, metric: "land-change", unit: "% comparable area", label: "Land-cover classification difference", limitations: "Share of comparable pixels with a different IGBP class from the first selected year. Classification differences include map uncertainty and are not verified land conversion. MODIS annual land-cover maps are not designed as a validated change-detection product." },
  "built-up-area": { ...annual, metric: "built-up", unit: "% observed area", label: "Mapped urban / built-up cover", limitations: "Share of valid MODIS pixels classified as urban or built-up (IGBP class 13). At 500 m it misses small settlements and is not a building inventory." },
  "settlement-expansion": { ...annual, metric: "built-change", unit: "percentage points", label: "Built-up cover difference from baseline", limitations: "Change in the share of urban-class pixels on a common valid mask relative to the first selected year. Classification noise can look like expansion; this does not confirm new construction." },
  "land-use-change": { ...annual, metric: "crop-change", unit: "percentage points", label: "Cropland cover difference from baseline", limitations: "Agricultural-cover proxy: cropland and cropland/natural-vegetation mosaic classes (12 and 14). It does not observe actual land use, zoning or construction. Differences may reflect classification error." },
  "water-extent": { ...water },
  "seasonal-water-change": { ...water, label: "Monthly surface-water cover", limitations: `${water.limitations} Compare months to examine seasonality; no seasonal anomaly or change significance is inferred.` },
  "urban-vegetation": {
    collection: "MODIS/061/MOD13Q1", band: "NDVI", metric: "urban-ndvi", scale: 250, cadence: "16-day composites", start: "2000-02-18", end: "2025-12-31", defaultStart: "2024-01-01", defaultEnd: "2024-12-31",
    unit: "NDVI", label: "Urban vegetation greenness (NDVI over built-up pixels)",
    limitations: `Mean NASA MODIS MOD13Q1 v061 NDVI (Terra, 250 m, 16-day composite) over built-up pixels only; NDVI ranges from -0.2 to 1 and higher values mean greener cover. Only pixels with SummaryQA / pixel reliability 0 (good) or 1 (marginal, usable) are kept; cloud, snow and fill pixels are excluded. ${URBAN_MASK_NOTE} NDVI shows greenness, not tree counts, park area or vegetation health.`,
    sourceName: "NASA MODIS Terra MOD13Q1 v061 NDVI (250 m, 16-day) masked to NASA MCD12Q1 v061 urban land cover (500 m)",
    sourceUrl: "https://lpdaac.usgs.gov/products/mod13q1v061/",
  },
  "urban-surface-temperature": {
    collection: "MODIS/061/MOD11A2", band: "LST_Day_1km", metric: "urban-lst", scale: 1000, cadence: "8-day composites", start: "2000-02-18", end: "2025-12-31", defaultStart: "2024-01-01", defaultEnd: "2024-12-31",
    unit: "°C", label: "Urban daytime land-surface temperature",
    limitations: `Mean NASA MODIS MOD11A2 v061 daytime land-surface temperature (Terra, 1 km, 8-day composite) over 1 km pixels that are at least half built-up. Clear-sky surface temperature, distinct from air temperature and not a heat-health warning. Only good-quality retrievals with estimated LST error at most 1 K are used; cloudy periods have no value. ${URBAN_MASK_NOTE}`,
    sourceName: "NASA MODIS Terra MOD11A2 v061 daytime LST (1 km, 8-day) masked to NASA MCD12Q1 v061 urban land cover (500 m)",
    sourceUrl: "https://lpdaac.usgs.gov/products/mod11a2v061/",
  },
  "burned-area": {
    collection: "MODIS/061/MCD64A1", band: "BurnDate", metric: "burned", scale: 500, cadence: "Monthly", start: "2000-11-01", end: "2026-08-31", defaultStart: "2024-01-01", defaultEnd: "2024-12-31",
    unit: "% of mapped land", label: "Burned area (share of mapped land burned per month)",
    limitations: "NASA MODIS MCD64A1 v061 burned-area product (Terra+Aqua, 500 m, monthly). A pixel counts as burned when the product assigns a burn date in that month; only land pixels with valid data (QA bits 0 and 1) are used. Small or low-intensity fires below about 25 ha, and fires hidden by persistent cloud, are often missed. The product is released several months after the event; burned area is distinct from active fire detections.",
    sourceName: "NASA MODIS MCD64A1 v061 Burned Area (500 m, monthly)",
    sourceUrl: "https://lpdaac.usgs.gov/products/mcd64a1v061/",
  },
  "evapotranspiration": { collection: "MODIS/061/MOD16A2GF", band: "ET", metric: "et", scale: 500, cadence: "8-day totals", start: "2000-01-01", end: "2025-12-31", defaultStart: "2024-01-01", defaultEnd: "2024-12-31", unit: "mm/composite", label: "Evapotranspiration", limitations: "Modelled water loss from soil and plants, summed per composite (normally 8 days, shorter at year-end). Good-quality retrievals only. Nonvegetated and missing pixels are excluded. This is not a daily rate or field measurement." },
};

export const EARTH_ENGINE_SETUP_MESSAGE = "This satellite dataset needs the site's Google Earth Engine connection. Registration and server access are not finished yet.";
