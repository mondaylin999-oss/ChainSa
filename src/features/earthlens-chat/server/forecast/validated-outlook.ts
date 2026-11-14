import "server-only";
import type { Region } from "../../regions";

/**
 * PHASE 3 HOOK — validated 30-day forecast probabilities.
 *
 * Nothing is implemented yet, on purpose: no forecast model has been validated for Myanmar.
 * Until an offline validation study (ECMWF SEAS5 hindcasts 1993–2016, GloFAS reforecasts
 * 2003–2022, verified against NASA POWER / IMERG) produces a skill table that passes the
 * agreed gate, this function returns null and the chatbot says the 30-day outlook cannot be
 * calculated reliably.
 *
 * Gate (fixed before seeing any results), per region × season × event:
 *   - Brier / ranked probability skill score vs climatology > 0, with the lower 95% bootstrap bound > 0
 *   - ROC area ≥ 0.6
 *   - no strong over-confidence in the reliability diagram
 * Only events that pass may show a probability.
 */

export interface ValidatedProbability {
  event: "rain_below_normal" | "rain_near_normal" | "rain_above_normal" | "very_heavy_rain" | "river_flood_2yr";
  /** 0–100. Only present when the validation gate was passed for this region, season and event. */
  probability: number;
  model: { name: string; version: string; issued: string; url: string };
  validation: { hindcastPeriod: string; observedWith: string; skillScore: number; skillScoreName: string; rocArea: number; reportUrl?: string };
}

export interface ValidatedOutlook {
  window: { start: string; end: string };
  probabilities: ValidatedProbability[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getValidatedOutlook(_region: Region, _window: { start: string; end: string }): Promise<ValidatedOutlook | null> {
  return null;
}
