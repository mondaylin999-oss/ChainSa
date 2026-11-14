/** Public product definitions are also used to explain coverage before a request. */
export type SatelliteMetric = "tree-cover" | "lst" | "land-change" | "built-up" | "built-change" | "crop-change" | "water" | "lights" | "et";
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
}
const annual = { collection: "MODIS/061/MCD12Q1", band: "LC_Type1", scale: 500, cadence: "Annual", start: "2001-01-01", end: "2024-12-31", defaultStart: "2020-01-01", defaultEnd: "2024-12-31" };
const water = { collection: "JRC/GSW1_4/MonthlyHistory", band: "water", metric: "water" as const, scale: 30, cadence: "Monthly", start: "1984-03-01", end: "2021-12-31", defaultStart: "2019-01-01", defaultEnd: "2021-12-31", unit: "% observed area", label: "Observed surface-water cover", limitations: "Monthly water share of valid observed pixels. Unobserved pixels are excluded. This historical product ends in 2021; it is not current flood detection or river flow." };
export const SATELLITE_PRODUCTS: Record<string, SatelliteProduct> = {
  "forest-cover": { collection: "MODIS/061/MOD44B", band: "Percent_Tree_Cover", metric: "tree-cover", scale: 250, cadence: "Annual", start: "2000-03-05", end: "2024-12-31", defaultStart: "2020-01-01", defaultEnd: "2024-12-31", unit: "% tree canopy", label: "Tree canopy cover", limitations: "Tree canopy percentage is not a legal forest designation or a deforestation measurement. Water and invalid pixels are excluded; detailed cloud flags are not applied." },
  "land-surface-temperature": { collection: "MODIS/061/MOD11A2", band: "LST_Day_1km", metric: "lst", scale: 1000, cadence: "8-day composites", start: "2000-02-18", end: "2025-12-31", defaultStart: "2025-01-01", defaultEnd: "2025-12-31", unit: "°C", label: "Daytime land-surface temperature", limitations: "Clear-sky daytime surface temperature, distinct from air temperature. Only good-quality retrievals with estimated LST error at most 1 K are used. Cloudy areas may have no observations." },
  "land-cover-change": { ...annual, metric: "land-change", unit: "% comparable area", label: "Land-cover classification difference", limitations: "Share of comparable pixels with a different IGBP class from the first selected year. Classification differences include map uncertainty and are not verified land conversion. MODIS annual land-cover maps are not designed as a validated change-detection product." },
  "built-up-area": { ...annual, metric: "built-up", unit: "% observed area", label: "Mapped urban / built-up cover", limitations: "Share of valid MODIS pixels classified as urban or built-up (IGBP class 13). At 500 m it misses small settlements and is not a building inventory." },
  "settlement-expansion": { ...annual, metric: "built-change", unit: "percentage points", label: "Built-up cover difference from baseline", limitations: "Change in the share of urban-class pixels on a common valid mask relative to the first selected year. Classification noise can look like expansion; this does not confirm new construction." },
  "land-use-change": { ...annual, metric: "crop-change", unit: "percentage points", label: "Cropland cover difference from baseline", limitations: "Agricultural-cover proxy: cropland and cropland/natural-vegetation mosaic classes (12 and 14). It does not observe actual land use, zoning or construction. Differences may reflect classification error." },
  "water-extent": { ...water },
  "seasonal-water-change": { ...water, label: "Monthly surface-water cover", limitations: `${water.limitations} Compare months to examine seasonality; no seasonal anomaly or change significance is inferred.` },
  "nighttime-lights": { collection: "NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG", band: "avg_rad", metric: "lights", scale: 500, cadence: "Monthly", start: "2012-04-01", end: "2025-12-31", defaultStart: "2024-01-01", defaultEnd: "2024-12-31", unit: "nW/cm²/sr", label: "Nighttime radiance", limitations: "Mean radiance where cloud-free observation count is positive. This product can include fires, boats and other temporary lights; it does not measure electricity supply, access or demand." },
  "evapotranspiration": { collection: "MODIS/061/MOD16A2GF", band: "ET", metric: "et", scale: 500, cadence: "8-day totals", start: "2000-01-01", end: "2025-12-31", defaultStart: "2024-01-01", defaultEnd: "2024-12-31", unit: "mm/composite", label: "Evapotranspiration", limitations: "Modelled water loss from soil and plants, summed per composite (normally 8 days, shorter at year-end). Good-quality retrievals only. Nonvegetated and missing pixels are excluded. This is not a daily rate or field measurement." },
};

export const EARTH_ENGINE_SETUP_MESSAGE = "This satellite dataset needs the site's Google Earth Engine connection. Registration and server access are not finished yet.";
