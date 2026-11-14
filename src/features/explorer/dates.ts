/** Date contract adapted from the environmental handover: real ISO dates and ordered historical ranges. */
export function observationDateError(start: string, end: string, today = new Date().toISOString().slice(0,10)): string {
  if (!start || !end) return "Choose both a start date and an end date, then apply the range.";
  const valid = (value:string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
  if (!valid(start) || !valid(end)) return "Choose real calendar dates in YYYY-MM-DD format.";
  if (start > end) return "Start date must be on or before end date.";
  if (start < "1981-01-01") return "NASA POWER observations begin at 1981-01-01.";
  if (end > today) return "Future observation dates are not available.";
  return "";
}
