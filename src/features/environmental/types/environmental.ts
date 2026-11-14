export type Indicator = "temperature" | "ndvi" | "precipitation" | "environmental";

export interface GeoJsonPolygon {
  type: "Polygon";
  /** GeoJSON positions are [longitude, latitude]. */
  coordinates: number[][][];
}

export interface LocationRequest {
  locationName: string;
  geometry?: GeoJsonPolygon;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  indicator: Indicator;
}

export interface Observation {
  date: string;
  value: number;
  unit: string;
  source: string;
  quality?: "good" | "marginal";
  validPixelFraction?: number;
}

export interface DataSeries {
  indicator: Indicator;
  dataset: string;
  provider?: string;
  spatialResolution: string;
  temporalResolution: string;
  observations: Observation[];
  limitations: string[];
  processing?: string[];
  validObservationCount?: number;
  missingObservationCount?: number;
  scaleFactor?: number;
  qaPolicy?: string;
  spatialSelection?: "polygon-mean" | "representative-point";
  requestedStartDate?: string;
  requestedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  rejectedObservationCount?: number;
  datasetId?: string;
  satellite?: string;
  instrument?: string;
}
