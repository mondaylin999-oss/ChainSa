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
  /** Null when no location was named in the question or selected on the map. */
  region: { id: string; name: string; nameMy: string } | null;
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
  kind: "environmental" | "general" | "needs_region";
  /** Priority topics detected in the question. */
  topics: ("drought" | "flood" | "agriculture")[];
  /** EarthLens indicators (rule-based, not official declarations). */
  indicators: { drought: string; wet: string; heat: string };
  /** 30-day outlook. `forecastAvailable` stays false until a model passes validation. */
  outlook: { window: { start: string; end: string }; forecastAvailable: boolean; historical: Fact[] };
  recommendations: { id: string; text: string; reason: string; uncertainty: string }[];
  /** The answer sections as separate strings (same text as `answer`). Empty for general questions, except direct + disclaimer. */
  sections: Record<SectionKey, string>;
  /** Executive Summary shown at the top (same text as sections.summary). */
  summary: string;
  /** The summary as three separate paragraphs (region · key findings · key recommendation). Null for general questions. */
  summaryParts: SummaryParts | null;
  /** Compact table of the most relevant NASA measurements (null for general questions or without data). */
  dataTable: DataTable | null;
  /** Evidence-based Action Cards built by the server from NASA facts (never by the AI). */
  actionCards: ActionCard[];
  /** Shown instead of cards when the evidence is not enough for a reliable recommendation. */
  actionNote: string | null;
}

export interface ChatErrorBody {
  error: string;
  code: "invalid_request" | "rate_limited" | "server_error" | "forbidden_origin";
}

export interface SummaryParts {
  /** Which state/region the answer is about, and whether it came from the question or the map. */
  region: string;
  /** 1–2 most important findings, taken from the NASA data table. */
  keyFindings: string;
  /** Most important option to consider, from the top Action Card (or what evidence is missing). */
  recommendation: string;
  /** False when the user has not chosen any location. */
  regionSelected: boolean;
}

export type SectionKey = "summary" | "current" | "history" | "outlook" | "actions" | "sources" | "disclaimer";

export interface TableValue {
  value: number;
  unit: string;
  /** Observation date or period, or the reference period, as text. */
  when: string;
}

/** One measurement row. Values come from NASA facts; `difference` is calculated by the server. */
export interface DataTableRow {
  param: ParamKey;
  label: string;
  latest: TableValue;
  /** Typical value for the same dates in past years (median or mean, as named in `referenceLabel`). Null if unavailable. */
  reference: TableValue | null;
  referenceLabel: string | null;
  /** latest − reference, same unit. Null when there is no reference. */
  difference: { value: number; unit: string } | null;
  /** Percentile rank among past years, when calculated. */
  rank: number | null;
  /** Fact ids used for this row. */
  factIds: string[];
}

export interface DataTable {
  rows: DataTableRow[];
}

export type ConfidenceLevel = "high" | "moderate" | "low" | "insufficient";

export type DecisionType = "agriculture" | "water" | "electricity" | "disaster" | "heat" | "vegetation";

export interface ActionCard {
  id: string;
  decisionType: DecisionType;
  title: string;
  observedChange: string;
  potentialImpact: string;
  suggestedOptions: string[];
  evidenceNeeded: string[];
  /** Strength of the evidence behind this card — NOT a probability. */
  confidence: { level: ConfidenceLevel; reason: string };
  /** Ids of the NASA facts the observed change is based on (built server-side). */
  evidenceRefs: string[];
}
