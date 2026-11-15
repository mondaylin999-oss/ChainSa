import "server-only";
import { EARTH_ENGINE_SETUP_MESSAGE } from "../satellite-products";
import { earthEngineStatus, type EarthEngineStatus } from "./earth-engine";
import { blackMarbleTokenStatus, type TokenStatus } from "./black-marble-laads";

export interface SourceState { available: boolean; setupRequired: boolean; reason?: string; access?: "nasa-laads" | "earth-engine" }

export const EE_REASONS: Record<Exclude<EarthEngineStatus, "valid">, string> = {
  missing: EARTH_ENGINE_SETUP_MESSAGE,
  invalid: "Google Earth Engine settings are present but were rejected. Check the service-account key format, that the Cloud project is registered for noncommercial Earth Engine use, and that the service account has the Earth Engine Resource Viewer and Service Usage Consumer roles.",
  unavailable: "Google Earth Engine did not respond when access was checked. Try again later.",
};
export const TOKEN_REASONS: Record<Exclude<TokenStatus, "valid">, string> = {
  missing: "Needs a free NASA Earthdata Login token on the server (EARTHDATA_TOKEN) to read NASA Black Marble directly from LAADS DAAC, or a working Google Earth Engine connection.",
  invalid: "The server's EARTHDATA_TOKEN was rejected by NASA Earthdata (expired or invalid). Generate a new token at urs.earthdata.nasa.gov; tokens expire after about 60–90 days.",
  "not-authorized": "The server's EARTHDATA_TOKEN is valid, but this Earthdata account has not yet authorized NASA LAADS DAAC. Sign in once at https://ladsweb.modaps.eosdis.nasa.gov (Login → Earthdata Login) with the same account and approve the LAADS application; the token then works within a few minutes.",
  unavailable: "NASA LAADS DAAC could not be reached to verify Black Marble access. Try again later.",
};

/** Black Marble prefers direct NASA LAADS access; Earth Engine is the fallback processing route. */
export function blackMarbleState(token: TokenStatus, ee: EarthEngineStatus): SourceState {
  if (token === "valid") return { available: true, setupRequired: false, access: "nasa-laads" };
  if (ee === "valid") return { available: true, setupRequired: false, access: "earth-engine" };
  return { available: false, setupRequired: token !== "unavailable", reason: token === "missing" && ee !== "missing" ? `${TOKEN_REASONS.missing} ${EE_REASONS[ee]}` : TOKEN_REASONS[token] };
}

export function earthEngineState(ee: EarthEngineStatus, publicFallback: boolean): SourceState {
  if (ee === "valid") return { available: true, setupRequired: false, access: "earth-engine" };
  if (publicFallback) return { available: true, setupRequired: false };
  return { available: false, setupRequired: ee !== "unavailable", reason: EE_REASONS[ee] };
}

export async function sourceStatuses() {
  const [ee, token] = await Promise.all([earthEngineStatus(), blackMarbleTokenStatus()]);
  return { ee, token };
}
