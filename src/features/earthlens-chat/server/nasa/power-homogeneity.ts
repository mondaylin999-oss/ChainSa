/**
 * NASA POWER (source: MERRA-2) daily point data over Myanmar have an abrupt discontinuity during 2008.
 *
 * Evidence (checked 2026-11-15 against POWER API v2.10.3, eight points from Sittwe to Myeik):
 * - PRECTOTCORR annual totals before 2008 are physically implausible (e.g. Yangon 185–508 mm/yr in 1998–2007,
 *   Mandalay 1–25 mm/month through the 2007 monsoon) and jump during the 2008 monsoon (Yangon 1,241–2,360 mm/yr
 *   in 2009–2025). 2008 itself is a transition year; 2009 is the first fully consistent year at every point checked.
 * - Variables driven by MERRA-2's land-surface model or near-surface state shift at the same time:
 *   GWETROOT and GWETTOP (wetter), T2M_MAX (about 2 °C cooler at Yangon), RH2M (about 10 points more humid),
 *   and, more mildly, T2M and T2M_MIN. ALLSKY_SFC_SW_DWN and WS10M show no comparable shift.
 *
 * Documented mechanism (not a confirmed root cause for Myanmar specifically): MERRA-2 corrects land precipitation
 * with the NOAA CPC Unified daily gauge analysis (CPCU); NASA GMAO reports CPCU problems where gauges are sparse
 * and temporal inconsistencies around CPCU processing changes (Reichle & Liu 2021, NASA/TM-2021-104606 Vol. 59).
 * In the CPCU real-time files, central Myanmar has gauge reports with low totals in July 2007 and none in July
 * 2008–2010, which is consistent with the jump. The corrected precipitation forces the land model, explaining the
 * coherent shifts in soil wetness, temperature and humidity.
 *
 * Consequence: values before and after 2009 must not be compared. Historical comparisons use only 2009 onward.
 */
export const POWER_CONSISTENT_FROM = "2009-01-01";
export const POWER_CONSISTENT_FIRST_YEAR = 2009;
/** Fixed, reproducible provisional baseline for Explorer indicators: the complete post-break years available. */
export const POWER_PROVISIONAL_BASELINE = { firstYear: 2009, lastYear: 2025 } as const;
/** POWER parameters with a confirmed shift across 2008 at the Myanmar points checked. */
export const POWER_BREAK_PARAMETERS = new Set(["PRECTOTCORR", "GWETROOT", "GWETTOP", "T2M_MAX", "T2M", "T2M_MIN", "RH2M"]);

export const POWER_BREAK_NOTE =
  "NASA POWER (MERRA-2) data for Myanmar change abruptly during 2008: rainfall before 2008 is implausibly low, and soil wetness, temperature and humidity shift at the same time. Values before 2009 are not comparable with later values.";

export function powerBaselineLabel(firstYear: number, lastYear: number) {
  return `provisional ${lastYear - firstYear + 1}-year post-2008 baseline (${firstYear}–${lastYear}), not a standard 30-year climate normal`;
}

/** True when any of the parameters is affected and the requested range reaches before 2009. */
export function crossesPowerBreak(parameters: string[], start: string) {
  return start < POWER_CONSISTENT_FROM && parameters.some(p => POWER_BREAK_PARAMETERS.has(p));
}
