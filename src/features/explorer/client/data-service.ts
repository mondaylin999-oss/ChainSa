import type { DatasetDefinition, TopicId } from "../catalog";
import type { Region } from "../../earthlens-chat/regions";

export interface Township { id: string; regionId: string; name: string; nameMy: string }

export interface ExploreCatalog {
  topics: typeof import("../catalog").TOPICS;
  datasets: DatasetDefinition[];
  regions: Region[];
  townships: Township[];
  townshipCoverage: { available: boolean; observationsAvailable: boolean; reason: string };
}

export interface Observation {
  date: string;
  value: number | null;
  validAreaKm2?: number | null;
}

export interface ObservationResponse {
  observations: Observation[];
  summary: { count: number; mean: number | null; min: number | null; max: number | null; latest: number | null };
  dataset: DatasetDefinition;
  region: { id: string; name: string; nameMy: string; lat: number; lon: number };
  location?: { id: string; name: string; nameMy: string; lat: number; lon: number; type: "township" | "region" };
  /** Point, pixel window, buffer or genuine full-boundary calculation. */
  spatialBasis?: { kind: "point" | "pixel-window" | "grid-cell" | "river-reach" | "buffer" | "area-average" | "area-total"; label: string };
  /** Shown prominently when the selected range crosses a known data discontinuity. */
  dataWarning?: string;
  period: { start: string; end: string };
  source: DatasetDefinition["source"];
  geographicCoverage: string;
  observedAt: string;
  missingCount: number;
  spatialSelection?: "polygon-mean" | "representative-point";
  qaPolicy?: string;
}

export async function fetchExploreCatalog(signal?: AbortSignal): Promise<ExploreCatalog> {
  const response = await fetch("/api/explore/catalog", { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load the data catalogue (HTTP ${response.status}).`);
  return response.json() as Promise<ExploreCatalog>;
}

export async function fetchObservations(
  selection: { topicId: TopicId; regionId: string; datasetId: string; start: string; end: string; townshipId?: string },
  signal?: AbortSignal,
): Promise<ObservationResponse> {
  const response = await fetch("/api/explore/observations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(selection),
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : `Could not retrieve observations (HTTP ${response.status}).`);
  return result as ObservationResponse;
}
