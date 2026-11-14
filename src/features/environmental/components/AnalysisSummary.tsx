import type { AnalysisResult } from "../analysis/explainChanges.js";

export interface AnalysisSummaryProps {
  analysis?: AnalysisResult;
  loading?: boolean;
  error?: string;
}

export function AnalysisSummary({ analysis, loading = false, error }: AnalysisSummaryProps) {
  if (loading) return <section aria-live="polite">Calculating environmental analysis…</section>;
  if (error) return <section role="alert">Unable to calculate analysis: {error}</section>;
  if (!analysis) return <section aria-live="polite">Analysis will appear when valid observations are available.</section>;

  const { statistics } = analysis;
  return (
    <section aria-label="Environmental change analysis">
      <h2>Environmental change analysis</h2>
      <h3>Observed in the data</h3>
      <p>{analysis.observed}</p>
      {statistics.observationCount > 0 && (
        <dl>
          <dt>Observations</dt><dd>{statistics.observationCount}</dd>
          <dt>Overall trend</dt><dd>{statistics.trend}</dd>
          <dt>Absolute change</dt><dd>{statistics.absoluteChange?.toFixed(3)}</dd>
          {statistics.percentageChange !== undefined && (
            <><dt>Percentage change</dt><dd>{statistics.percentageChange.toFixed(2)}%</dd></>
          )}
          <dt>Minimum</dt><dd>{statistics.minimum?.value} on {statistics.minimum?.date}</dd>
          <dt>Maximum</dt><dd>{statistics.maximum?.value} on {statistics.maximum?.date}</dd>
        </dl>
      )}
      <h3>Interpretation</h3>
      <p>{analysis.interpretation}</p>
      <h3>Limitations</h3>
      <ul>{analysis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
    </section>
  );
}
