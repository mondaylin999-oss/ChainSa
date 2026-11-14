import type { DataSeries } from "../types/environmental";
import { calculateStatistics, type SeriesStatistics } from "../processing/statistics";

export interface AnalysisResult {
  statistics: SeriesStatistics;
  observed: string;
  interpretation: string;
  limitations: string[];
}

export function analyzeSeries(series: DataSeries): AnalysisResult {
  const statistics = calculateStatistics(series);
  if (!statistics.first || !statistics.last) {
    return {
      statistics,
      observed: "No valid observations were available for this date range.",
      interpretation: "No environmental interpretation can be made without observations.",
      limitations: series.limitations,
    };
  }

  const direction = statistics.trend === "stable" ? "showed no clear directional change in the descriptive calculation" : `showed an overall ${statistics.trend} pattern`;
  const variability = statistics.standardDeviation === undefined ? "" : ` The sample standard deviation was ${statistics.standardDeviation.toFixed(4)} ${statistics.first.unit}.`;
  return {
    statistics,
    observed: `${series.dataset} ${direction} from ${statistics.first.value} ${statistics.first.unit} on ${statistics.first.date} to ${statistics.last.value} ${statistics.last.unit} on ${statistics.last.date}.`,
    interpretation: `This is a description of the measured series and its calculated trend; it does not establish a cause or independent environmental impact.${variability}`,
    limitations: series.limitations,
  };
}
