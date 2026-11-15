import type { DataSeries, Observation } from "../types/environmental";

export type MonthlyStatus = "complete" | "partial" | "missing" | "unknown-coverage";
export interface MonthlySummary { month: string; mean?: number; minimum?: number; maximum?: number; validObservationCount: number; actualStartDate?: string; actualEndDate?: string; expectedObservationCount?: number; status: MonthlyStatus; unit?: string; }
export interface SeasonalSummary { season: "Q1" | "Q2" | "Q3" | "Q4"; months: string[]; mean?: number; validObservationCount: number; representedYears: number; status: "supported" | "insufficient"; explanation: string; }
export interface YearQuarterSummary { year: number; quarter: "Q1" | "Q2" | "Q3" | "Q4"; representedMonths: number; validObservationCount: number; mean?: number; minimum?: number; maximum?: number; actualStartDate?: string; actualEndDate?: string; status: "supported" | "insufficient"; }
export interface TemporalSummaryResult { monthly: MonthlySummary[]; seasonal: SeasonalSummary[]; yearQuarter: YearQuarterSummary[]; cadence: "daily" | "composite" | "monthly" | "annual" | "unknown"; aggregationAvailable: boolean; unit?: string; unitWarning?: string; aggregationMethod: string; invalidDateCount: number; duplicateDateCount: number; identicalDuplicateDateCount: number; conflictingDuplicateDateCount: number; duplicateInvalidDateCount: number; duplicateDates: string[]; missingMonths: string[]; unavailableMonths: string[]; limitations: string[]; }

/** Calendar means weight valid observations equally; they are not time-weighted. */
export function summarizeTemporalData(series: DataSeries): TemporalSummaryResult {
  const cadence = cadenceOf(series);
  const invalid = series.observations.filter((item) => !strictDate(item.date));
  const valid = series.observations.filter((item) => Number.isFinite(item.value) && strictDate(item.date));
  const units = [...new Set(series.observations.map((item) => item.unit.trim()).filter(Boolean))];
  const missingUnit = series.observations.some((item) => !item.unit.trim());
  const unitWarning = missingUnit || units.length > 1 ? missingUnit ? "Some observations have missing units; temporal aggregation is unavailable." : `Mixed units detected (${units.join(", ")}); temporal aggregation is unavailable.` : undefined;
  const byDate = new Map<string, Observation[]>();
  for (const item of valid) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  const duplicateDates = [...byDate.entries()].filter(([, values]) => values.length > 1).map(([date]) => date);
  const duplicateInvalidDateCount = invalid.length - new Set(invalid.map((item) => item.date)).size;
  let identicalDuplicateDateCount = 0; let conflictingDuplicateDateCount = 0;
  for (const date of duplicateDates) { const values = byDate.get(date)!.map((item) => item.value); if (values.every((value) => value === values[0])) identicalDuplicateDateCount++; else conflictingDuplicateDateCount++; }
  const duplicateSet = new Set(duplicateDates);
  const usable = unitWarning ? [] : valid.filter((item) => !duplicateSet.has(item.date)).sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = new Map<string, Observation[]>();
  for (const item of usable) { const key = item.date.slice(0, 7); byMonth.set(key, [...(byMonth.get(key) ?? []), item]); }
  const monthKeys = cadence === "annual" ? [] : expectedMonthKeys(series, usable);
  const monthly = monthKeys.map((month) => monthSummary(month, byMonth.get(month) ?? [], cadence, series));
  const missingMonths = monthly.filter((item) => item.status === "missing").map((item) => item.month);
  const unavailableMonths = cadence === "daily" ? [] : [];
  const yearQuarter = buildYearQuarter(monthly);
  const seasonal = buildSeasonal(yearQuarter, cadence);
  const limitations = [cadence === "daily" ? "Monthly means summarize available daily observations within the requested dates; missing days are not interpolated." : cadence === "composite" ? "Monthly means summarize available composite observations; composites are not expanded into daily values and missing composite availability is unknown without backend metadata." : "Temporal cadence is unavailable, so completeness cannot be judged reliably.", unitWarning, invalid.length ? `${invalid.length} invalid date observation(s) were excluded.` : "", duplicateDates.length ? `${identicalDuplicateDateCount} identical and ${conflictingDuplicateDateCount} conflicting duplicate date(s) were excluded.` : "", duplicateInvalidDateCount ? `${duplicateInvalidDateCount} duplicate invalid date string(s) were detected.` : ""].filter(Boolean) as string[];
  return { monthly, seasonal, yearQuarter, cadence, aggregationAvailable: !unitWarning && cadence !== "annual", unit: units.length === 1 ? units[0] : undefined, unitWarning, aggregationMethod: "Observation-weighted arithmetic mean; no interpolation; not time-weighted.", invalidDateCount: invalid.length, duplicateDateCount: duplicateDates.length, identicalDuplicateDateCount, conflictingDuplicateDateCount, duplicateInvalidDateCount, duplicateDates, missingMonths, unavailableMonths, limitations };
}

function monthSummary(month: string, values: Observation[], cadence: TemporalSummaryResult["cadence"], series: DataSeries): MonthlySummary {
  const expected = cadence === "daily" ? expectedDaysInRequestedMonth(month, series.requestedStartDate, series.requestedEndDate) : undefined;
  const base = { month, validObservationCount: values.length, expectedObservationCount: expected, unit: values[0]?.unit };
  if (!values.length) return { ...base, status: expected === undefined ? "unknown-coverage" : "missing" };
  const nums = values.map((item) => item.value);
  return { ...base, mean: nums.reduce((sum, value) => sum + value, 0) / nums.length, minimum: Math.min(...nums), maximum: Math.max(...nums), actualStartDate: values[0].date, actualEndDate: values.at(-1)!.date, status: expected === undefined ? "unknown-coverage" : nums.length >= expected ? "complete" : "partial" };
}

function buildYearQuarter(monthly: MonthlySummary[]): YearQuarterSummary[] { const map = new Map<string, MonthlySummary[]>(); for (const item of monthly) { if (item.mean === undefined) continue; const year = item.month.slice(0, 4); const quarter = quarterOf(item.month); const key = `${year}-${quarter}`; map.set(key, [...(map.get(key) ?? []), item]); } return [...map.entries()].map(([key, items]) => { const [yearText, quarter] = key.split("-") as [string, YearQuarterSummary["quarter"]]; const values = items.map((item) => item.mean!); const supported = items.length >= 2; const status: YearQuarterSummary["status"] = supported ? "supported" : "insufficient"; return { year: Number(yearText), quarter, representedMonths: items.length, validObservationCount: items.reduce((sum, item) => sum + item.validObservationCount, 0), mean: supported ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined, minimum: supported ? Math.min(...values) : undefined, maximum: supported ? Math.max(...values) : undefined, actualStartDate: items[0].actualStartDate, actualEndDate: items.at(-1)!.actualEndDate, status }; }).sort((a, b) => a.year - b.year || a.quarter.localeCompare(b.quarter)); }
function buildSeasonal(yearQuarter: YearQuarterSummary[], cadence: TemporalSummaryResult["cadence"]): SeasonalSummary[] { return (["Q1", "Q2", "Q3", "Q4"] as const).map((season) => { const rows = yearQuarter.filter((item) => item.quarter === season); const supportedYears = rows.filter((item) => item.status === "supported"); const supported = cadence !== "unknown" && cadence !== "annual" && supportedYears.length >= 2; const selected = supportedYears.flatMap((item) => item.mean === undefined ? [] : [item.mean]); return { season, months: quarterMonths(season), mean: supported ? selected.reduce((sum, value) => sum + value, 0) / selected.length : undefined, validObservationCount: supportedYears.reduce((sum, item) => sum + item.validObservationCount, 0), representedYears: supportedYears.length, status: supported ? "supported" : "insufficient", explanation: supported ? "Pooled calendar-quarter summary across supported years; each year-quarter mean contributes equally. Descriptive only, not a climate-normal or significance test." : "Insufficient year-specific quarter coverage; no pooled seasonal conclusion is reported." }; }); }
function cadenceOf(series: DataSeries): TemporalSummaryResult["cadence"] { const text = series.temporalResolution.toLowerCase(); return text.includes("daily") ? "daily" : /composite|\d+-day/.test(text) ? "composite" : /monthly/.test(text) ? "monthly" : /annual|yearly/.test(text) ? "annual" : "unknown"; }
function expectedMonthKeys(series: DataSeries, observations: Observation[]): string[] { const start = series.requestedStartDate ?? observations[0]?.date; const end = series.requestedEndDate ?? observations.at(-1)?.date; if (!start || !end || !strictDate(start) || !strictDate(end)) return [...new Set(observations.map((item) => item.date.slice(0, 7)))].sort(); const result: string[] = []; const date = new Date(`${start.slice(0, 7)}-01T00:00:00Z`); const last = end.slice(0, 7); while (date.toISOString().slice(0, 7) <= last) { result.push(date.toISOString().slice(0, 7)); date.setUTCMonth(date.getUTCMonth() + 1); } return result; }
function expectedDaysInRequestedMonth(month: string, start?: string, end?: string) { const first = `${month}-01`; const [year, value] = month.split("-").map(Number); const last = new Date(Date.UTC(year, value, 0)).toISOString().slice(0, 10); const from = start && start > first ? start : first; const to = end && end < last ? end : last; return from <= to ? Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1 : 0; }
function quarterOf(month: string): YearQuarterSummary["quarter"] { const n = Number(month.slice(5, 7)); return n <= 3 ? "Q1" : n <= 6 ? "Q2" : n <= 9 ? "Q3" : "Q4"; }
function quarterMonths(quarter: YearQuarterSummary["quarter"]) { return ({ Q1: ["01", "02", "03"], Q2: ["04", "05", "06"], Q3: ["07", "08", "09"], Q4: ["10", "11", "12"] }[quarter]); }
function strictDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }
