// Shared types for the EarthLens website (dashboard, map). Safe for browser and server.

export type SiteParam = "rainfall" | "temperature" | "humidity" | "wind" | "soilWetness" | "fires";

export interface MetricRow {
  label: string;
  value: number;
  unit: string;
}

export interface MetricCard {
  param: SiteParam;
  title: string;
  headline: MetricRow;
  rows: MetricRow[];
}

export interface SeriesChart {
  title: string;
  kind: "bar" | "line";
  unit: string;
  series: { name: string; color: string; points: { date: string; value: number }[] }[];
}

export interface TextItem {
  title: string;
  body: string;
}

export interface AnalyzeResult {
  region: { id: string; name: string; nameMy: string; type: string; lat: number; lon: number; coastal: boolean };
  period: { start: string; end: string };
  latestDate: string | null;
  /** Always "live": this site never shows sample data. */
  mode: "live";
  summary: string;
  metrics: MetricCard[];
  charts: SeriesChart[];
  insights: TextItem[];
  implications: TextItem[];
  sources: { name: string; url: string; detail: string }[];
  limitations: string[];
  retrievedAt: string;
}

export interface SiteStatus {
  power: boolean;
  firms: boolean;
  llm: boolean;
  llmProvider: "openrouter" | "groq" | null;
}
