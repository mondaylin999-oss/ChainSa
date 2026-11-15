import type { DatasetDefinition } from "./catalog";
import type { ObservationSelection } from "./client/data-service";
import { observationDateError } from "./dates";

/** UI validation only: published dataset limits and the existing API contract. */
export function selectionError(selection: ObservationSelection, dataset: DatasetDefinition | undefined, mode: "township" | "reference", today = new Date().toISOString().slice(0, 10)): string {
  if (!selection.regionId) return "Choose a state or region first.";
  if (mode === "township" && !selection.townshipId) return "Choose a township within the selected region.";
  if (!dataset) return "Choose an environmental indicator.";
  if (!dataset.available) return dataset.setupRequired ? "This indicator requires data-source setup." : "This indicator is currently unavailable.";
  const dates = observationDateError(selection.start, selection.end, today);
  if (dates) return dates;
  const coverage = dataset.coverage;
  if (coverage?.start && /^\d{4}-\d{2}-\d{2}$/.test(coverage.start) && selection.start < coverage.start) return `This dataset begins on ${coverage.start}.`;
  if (coverage && !coverage.ongoing && /^\d{4}-\d{2}-\d{2}$/.test(coverage.end) && selection.end > coverage.end) return `This dataset ends on ${coverage.end}.`;
  const days = (Date.parse(selection.end) - Date.parse(selection.start)) / 86400000 + 1;
  if (dataset.id === "fire-detections" && (days > 7 || Date.parse(selection.start) < Date.parse(today) - 6 * 86400000)) return "The public fire feed covers the most recent seven days. Choose dates within that period.";
  if (dataset.id === "aerosol-optical-depth" && days > 731) return "Choose up to two years for aerosol charts.";
  if (["river-discharge", "river-water-surface-elevation", "river-width", "river-surface-slope", "reservoir-surface-area"].includes(dataset.id) && days > 1100) return "Choose up to three years for SWOT charts.";
  if (dataset.id === "seasonal-water-change" && days > 366) return "Choose up to 12 months for monthly water comparisons.";
  if (["agriculture-vegetation-index", "vegetation-index"].includes(dataset.id) && days > 366) return "Choose up to one year for vegetation charts.";
  return "";
}
