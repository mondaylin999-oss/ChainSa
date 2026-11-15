import { chartText, type ChartLanguage } from "./chartCopy";
import { memo, useMemo } from "react";
import type { SignificanceResult } from "../analysis/significance";
import "./data-trend-insight.css";
import type { AnalysisResult } from "../analysis/explainChanges";
import type { DataSeries } from "../types/environmental";
import { buildDataTrendInsight } from "../analysis/dataTrendInsight";

function DataTrendInsightView({ series, analysis, locationName, latitude, longitude, loading = false, error, lang = "en" }: { series?: DataSeries; analysis?: AnalysisResult; locationName?: string; latitude?: number; longitude?: number; loading?: boolean; error?: string; lang?: ChartLanguage }) {
  const t = (text: string) => chartText(lang, text);
  const model = useMemo(() => series && analysis ? buildDataTrendInsight(series, analysis, { locationName, latitude, longitude }) : undefined, [series, analysis, locationName, latitude, longitude]);
  if (loading) return <section className="data-insight data-insight--state" aria-live="polite">{t("Loading Data and Trend Insight…")}</section>;
  if (error) return <section className="data-insight data-insight--state" role="alert">{t("Unable to load insight")}: {t(error)}</section>;
  if (!series || !analysis || !model) return <section className="data-insight data-insight--state" aria-live="polite">{t("Data and Trend Insight will appear when analysis is available.")}</section>;
  const list = (items: Array<{ label: string; value: string; explanation: string }>) => <dl>{items.map((item) => <div key={item.label}><dt>{t(item.label)}</dt><dd><strong>{t(item.value)}</strong><small>{t(item.explanation)}</small></dd></div>)}</dl>;
  const monthly = model.temporal.monthly.filter((item) => item.mean !== undefined);
  return <section className="data-insight" aria-label="Data and Trend Insight">
    <header><p className="data-insight__eyebrow">{t("ENVIRONMENTAL INTELLIGENCE")}</p><h2>{t("Data and Trend Insight")}</h2><p>{t("What was observed, what changed, and how much evidence supports the description.")}</p></header>
    <article className="data-insight__hero"><h3>{t("Environmental Overview")}</h3><p className="data-insight__summary">{t(model.overviewSummary)}</p><div className="data-insight__overview-grid"><div><span>{t("Location")}</span><strong>{model.overview.location}</strong></div><div><span>{t("Actual observations")}</span><strong>{t(model.overview.actualPeriod)}</strong></div><div><span>{t("Valid count")}</span><strong>{model.trend.validObservations}</strong></div><div><span>{t("Spatial basis")}</span><strong>{t(model.overview.selection)}</strong></div></div></article>
    <article><h3>{t("What Changed?")}</h3><strong className="data-insight__direction">{t(model.trend.direction)}</strong><dl><dt>{t("Descriptive change rate")}</dt><dd>{t(model.trend.rate)}</dd><dt>{t("Analysis period")}</dt><dd>{t(model.trend.period)}</dd></dl><p>{t(model.trend.explanation)}</p><div className="data-insight__stats">{model.keyStatistics.filter((item) => ["Absolute change", "Percentage change", "Minimum", "Maximum", "Mean value", "Variability (SD)"].includes(item.label)).map((item) => <div key={item.label}><span>{t(item.label)}</span><strong>{t(item.value)}</strong></div>)}</div></article>
    <article><h3>{t("Monthly and Calendar-quarter Patterns")}</h3><p>{t(model.temporal.cadence === "annual" ? "This dataset reports annual observations. Monthly and calendar-quarter summaries are unavailable." : model.temporal.aggregationMethod)}</p><p>{t("Calendar quarters group Jan–Mar, Apr–Jun, Jul–Sep, and Oct–Dec. They do not represent Myanmar’s wet and dry seasons.")}</p>{model.temporal.unitWarning && <p className="data-insight__warning">{t(model.temporal.unitWarning)}</p>}<div className="data-insight__months">{monthly.slice(-12).map((item) => <div key={item.month}><strong>{t(monthLabel(item.month))}</strong><span>{item.mean!.toFixed(3)} · {item.validObservationCount} {t("observations")}</span><small>{t(item.status === "complete" ? "Complete for requested days" : item.status === "partial" ? `${item.validObservationCount} of ${item.expectedObservationCount} requested days` : "Monthly completeness unknown")}</small></div>)}</div>{monthly.length > 12 && <p>{t("Showing the latest 12 months. Detailed summaries remain available in the analysis model.")}</p>}<p>{t(model.temporal.missingMonths.length ? `Months without returned observations: ${model.temporal.missingMonths.join(", ")}.` : model.temporal.cadence === "daily" ? "No requested calendar months are missing." : "Monthly completeness cannot be confirmed from the returned observation dates alone.")}</p><details><summary>{t("Show calendar-quarter details")}</summary>{model.temporal.seasonal.map((item) => <p key={item.season}><strong>{t(item.season)}:</strong> {t(item.status === "supported" ? `${item.mean!.toFixed(3)} pooled mean from ${item.representedYears} supported years.` : "Insufficient year-specific coverage.")} {t(item.explanation)}</p>)}{model.temporal.yearQuarter.map((item) => <p key={`${item.year}-${t(item.quarter)}`}><strong>{item.year} {t(item.quarter)}:</strong> {t(item.status === "supported" ? `${item.mean!.toFixed(3)} from ${item.representedMonths} months and ${item.validObservationCount} observations.` : `Insufficient coverage (${item.representedMonths} months).`)}</p>)}</details></article>
    <article><h3>{t("Understanding the Measurement")}</h3><h4>{t(model.measurement.name)}</h4><p>{t(model.measurement.what)}</p><dl><dt>{t("Parameter / dataset")}</dt><dd>{model.measurement.code}</dd><dt>{t("Unit")}</dt><dd>{model.measurement.unit}</dd></dl><details><summary>{t("What does this mean?")}</summary><p>{t(model.measurement.meaning)}</p><p><strong>{t("Important caution:")}</strong> {t(model.measurement.caution)}</p></details></article>
    <article><h3>{t("Data Quality and Geographic Coverage")}</h3>{list([...model.quality, ...model.geography])}</article>
    <article><h3>{t("Scientific Methodology")}</h3><p>{t("These summaries are descriptive calculations from the supplied processed observations. Statistical significance is shown only when the existing validated requirements are satisfied.")}</p><details><summary>{t("Show evidence and technical details")}</summary>{model.evidence.map((item) => <details key={item.conclusion}><summary>{t(item.conclusion)}</summary>{list([{ label: "Observations", value: item.observations, explanation: "Valid observations supporting this conclusion." }, { label: "Period", value: item.period, explanation: "Dates represented by the conclusion." }, { label: "Method", value: item.method, explanation: "Calculation used." }, { label: "Limitation", value: item.limitation, explanation: "What the result cannot establish." }])}</details>)}{list(model.sources.map((item) => ({ ...item, explanation: sourceExplanation(item.label) })))}<p><strong>{t(model.variabilityComparison.label)}:</strong> {t(model.variabilityComparison.value)}</p><p>{t(model.variabilityComparison.explanation)}</p></details></article>
    <article><h3>{t("Limitations and Unavailable Conclusions")}</h3><ul>{model.limitations.length ? model.limitations.map((item) => <li key={item}>{t(item)}</li>) : <li>{t("No additional limitations were supplied.")}</li>}</ul><details><summary>{t("Statistical significance")}</summary><p>{t(model.significance.status)}</p><SignificanceDetails lang={lang} result={model.significance.result} /><p>{t(model.significance.result?.interpretation ?? "No p-value or confidence interval is available unless the validated statistical requirements are satisfied.")}</p></details></article>

  </section>;
}

function sourceExplanation(label: string) { if (label === "Provider") return "Organization responsible for the data product or hosting service."; if (label === "Spatial resolution") return "Grid or pixel resolution; it does not imply administrative-area coverage."; if (label === "Temporal frequency") return "Observation cadence or composite period reported by the dataset."; if (label === "QA policy") return "Quality filtering applied before observations were returned."; return "Metadata supplied with the processed DataSeries."; }
function monthLabel(value: string) { const [year, month] = value.split("-"); return `${new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" })} ${year}`; }

export const DataTrendInsight = memo(DataTrendInsightView);

function SignificanceDetails({ result, lang }: { result: SignificanceResult; lang: ChartLanguage }) {
  const t = (text: string) => chartText(lang, text);
  const rows = [
    ["Method", result.method],
    ["Valid / expected observations", `${result.validObservationCount} / ${result.expectedObservationCount ?? "Not available"}`],
    ["Monthly means used", String(result.monthlyObservationCount)],
    ["Missing calendar months", result.missingCalendarMonths.join(", ") || "None"],
    ["Seasonal coverage", `${(result.seasonalCoverageFraction * 100).toFixed(1)}%`],
    ["Sen's slope", result.senSlope === undefined ? "Not available" : `${result.senSlope.toFixed(4)} ${result.slopeUnit ?? ""}`],
    ["P-value", result.pValue === undefined ? "Not available" : result.pValue < .0001 ? "< 0.0001" : result.pValue.toFixed(4)],
    ["95% slope interval", result.confidenceInterval ? `${result.confidenceInterval.lower.toFixed(4)} to ${result.confidenceInterval.upper.toFixed(4)} ${result.slopeUnit ?? ""} (approximate ${result.confidenceInterval.level * 100}% interval)` : result.confidenceIntervalReason ?? "Not enough supported observations to estimate an interval"],
    ["Interval method", result.confidenceIntervalMethod ?? "Calculated only when the significance checks pass"],
    ["Seasonal handling", result.seasonalHandling],
    ["Autocorrelation", result.autocorrelation === undefined ? "Not available" : result.autocorrelation.toFixed(3)],
    ["Autocorrelation handling", result.autocorrelationHandling],
  ];
  return <><dl>{rows.map(([label, value]) => <div key={t(label)}><dt>{t(label)}</dt><dd>{t(value)}</dd></div>)}</dl><p>{t("The slope interval describes uncertainty in the estimated yearly trend. It is not a forecast range.")}</p></>;
}
