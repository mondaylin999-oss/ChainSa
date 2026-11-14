// Shared types — safe to import from both browser and server code (no secrets here).

export type Lang = "en" | "my";

export type ParamKey = "rainfall" | "temperature" | "humidity" | "wind" | "soilWetness" | "fires" | "vegetation";

export type SourceId = "nasa-power-daily" | "nasa-firms-viirs" | "nasa-modis-ndvi";

export interface SourceRef {
  id: SourceId;
  name: string;
  url: string;
}

/** One measured or computed value taken directly from NASA data. The AI may only quote these. */
export interface Fact {
  id: string;
  param: ParamKey;
  /** e.g. "Total rainfall" */
  label: string;
  labelMy: string;
  value: number;
  unit: string;
  decimals: number;
  /** A single observation date (YYYY-MM-DD) when the fact refers to one day. */
  date?: string;
  /** Observation window when the fact summarises several days. */
  period?: { start: string; end: string };
  source: SourceId;
  /**
   * observation = measured/modelled NASA value for a recent date;
   * comparison  = how a recent value ranks against the same dates in past years (percentile);
   * historical  = statistic of past years for the coming 30 calendar days (NOT a forecast);
   * forecast    = output of a validated forecast model (not used until Phase 3).
   */
  kind?: "observation" | "comparison" | "historical" | "forecast";
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  message: string;
  /** UI language; the answer language is detected from the message and falls back to this. */
  lang?: Lang;
  /** Region currently selected on the map, used when the question names no region. */
  selectedRegionId?: string;
  history?: ChatHistoryItem[];
  sessionId?: string;
}

export type AttemptOutcome =
  | "ok"
  | "not_configured"
  | "rate_limited"
  | "http_error"
  | "timeout"
  | "empty"
  | "unverified_numbers"
  | "forbidden_claim";

export interface ProviderAttempt {
  provider: "openrouter" | "groq";
  model: string;
  outcome: AttemptOutcome;
}

export interface ChatResponseBody {
  answer: string;
  lang: Lang;
  region: { id: string; name: string; nameMy: string };
  period: { start: string; end: string } | null;
  sources: { name: string; url: string }[];
  facts: Fact[];
  /** Plain-text data block appended by the server: source, dates and units (never AI-written). */
  dataFooter: string;
  limitations: string[];
  generator: "llm" | "template";
  provider: "openrouter" | "groq" | null;
  model: string | null;
  attempts: ProviderAttempt[];
  verification: { numbersChecked: number; numbersVerified: number } | null;
  /** True only if NASA returned data for this answer. */
  nasaDataAvailable: boolean;
  /** Kept for compatibility with the original EarthLens chat panel. */
  mode: "live";
  /** environmental = eight-section NASA answer; general = short answer without NASA data. */
  kind: "environmental" | "general";
  /** Priority topics detected in the question. */
  topics: ("drought" | "flood" | "agriculture")[];
  /** EarthLens indicators (rule-based, not official declarations). */
  indicators: { drought: string; wet: string; heat: string };
  /** 30-day outlook. `forecastAvailable` stays false until a model passes validation. */
  outlook: { window: { start: string; end: string }; forecastAvailable: boolean; historical: Fact[] };
  recommendations: { id: string; text: string; reason: string; uncertainty: string }[];
  /** The eight answer sections as separate strings (same text as `answer`). Empty for general questions, except direct + disclaimer. */
  sections: Record<"direct" | "current" | "history" | "outlook" | "impacts" | "decision" | "sources" | "disclaimer", string>;
}

export interface ChatErrorBody {
  error: string;
  code: "invalid_request" | "rate_limited" | "server_error" | "forbidden_origin";
}
