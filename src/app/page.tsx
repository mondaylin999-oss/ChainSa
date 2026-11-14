"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Building2,
  ChartNoAxesCombined,
  ArrowUpRight,
  Droplets,
  ExternalLink,
  Leaf,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Radio,
  Sprout,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { ChatPanel } from "@/features/explorer/components/ChatPanel";
import { MyanmarMap } from "@/features/explorer/components/MyanmarMap";
import { fetchExploreCatalog, fetchObservations, type ExploreCatalog, type ObservationResponse } from "@/features/explorer/client/data-service";
import { TOPICS, type TopicId, type TopicIndicator } from "@/features/explorer/catalog";

type View = "home" | "explore";
type Lang = "en" | "my";
type ChartState = "initial" | "loading" | "ready" | "empty" | "unavailable" | "error";

const topicIcons = {
  agriculture: Sprout,
  "disaster-intelligence": TriangleAlert,
  "environmental-change": Leaf,
  "infrastructure-urban-change": Building2,
  water: Droplets,
  energy: Zap,
} satisfies Record<TopicId, typeof Sprout>;

const questionDate = (daysAgo: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

function formatValue(value: number | null, digits = 2) {
  return value === null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function ObservationChart({ result }: { result: ObservationResponse }) {
  const width = 800;
  const height = 340;
  const left = 72;
  const right = 785;
  const top = 26;
  const bottom = 274;
  const values = result.observations.map((observation) => observation.value).filter((value): value is number => value !== null);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = rawMin === rawMax ? Math.max(Math.abs(rawMin) * 0.06, 1) : (rawMax - rawMin) * 0.1;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const points = result.observations.map((observation, index) => {
    const x = left + (result.observations.length < 2 ? 0 : (index / (result.observations.length - 1)) * (right - left));
    const y = bottom - (((observation.value ?? min) - min) / (max - min)) * (bottom - top);
    return { ...observation, x, y };
  });
  let drawing = false;
  const path = points.map((point) => {
    if (point.value === null) {
      drawing = false;
      return "";
    }
    const command = `${drawing ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    drawing = true;
    return command;
  }).join(" ");

  return (
    <svg className="observation-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${result.dataset.description} in ${result.region.name}, ${result.period.start} to ${result.period.end}, in ${result.dataset.unit}`}>
      {[0, 1, 2, 3].map((step) => {
        const value = min + ((max - min) * step) / 3;
        const y = bottom - ((value - min) / (max - min)) * (bottom - top);
        return (
          <g key={step}>
            <line x1={left} x2={right} y1={y} y2={y} className="chart-gridline" />
            <text x={left - 12} y={y + 4} textAnchor="end" className="chart-tick">{formatValue(value)}</text>
          </g>
        );
      })}
      <line x1={left} x2={left} y1={top} y2={bottom} className="chart-axis" />
      <line x1={left} x2={right} y1={bottom} y2={bottom} className="chart-axis" />
      <path d={path} className="chart-series" />
      {points.map((point) => point.value === null ? null : (
        <circle key={point.date} cx={point.x} cy={point.y} r="3.3" className="chart-point">
          <title>{point.date}: {formatValue(point.value)} {result.dataset.unit}</title>
        </circle>
      ))}
      <text x={(left + right) / 2} y="329" textAnchor="middle" className="chart-axis-label">Observation date (UTC)</text>
      <text x="17" y={(top + bottom) / 2} textAnchor="middle" className="chart-axis-label" transform={`rotate(-90 17 ${(top + bottom) / 2})`}>
        {result.dataset.unit}
      </text>
      <text x={left} y="298" className="chart-tick">{result.observations[0]?.date}</text>
      <text x={right} y="298" textAnchor="end" className="chart-tick">{result.observations.at(-1)?.date}</text>
    </svg>
  );
}

function DataChart({ state, result, error, onRetry }: { state: ChartState; result: ObservationResponse | null; error: string; onRetry: () => void }) {
  if (state === "loading") {
    return <div className="chart-state" role="status"><LoaderCircle className="spin" size={24} /> Retrieving observations from the configured data service…</div>;
  }
  if (state === "initial") {
    return <div className="chart-state"><ChartNoAxesCombined size={25} /> Select a connected dataset and date range to view observations.</div>;
  }
  if (state === "unavailable") {
    return <div className="chart-state chart-unavailable"><Radio size={24} /> This dataset is not connected to a live data service. No values are displayed.</div>;
  }
  if (state === "error") {
    return <div className="chart-state chart-error" role="alert"><TriangleAlert size={24} /><span>{error || "Could not retrieve observations."}<button className="text-button" onClick={onRetry}>Try again</button></span></div>;
  }
  if (state === "empty" || !result) {
    return <div className="chart-state">No observations are available for this selection and period. Missing values are left blank, not treated as zero.</div>;
  }
  return (
    <div className="chart-plot">
      {result.summary.count === 0 ? (
        <div className="chart-state">NASA returned no valid observations for this period. Missing values are not plotted as zero.</div>
      ) : <ObservationChart result={result} />}
      <div className="chart-legend"><span className="legend-line" />{result.dataset.description}<span className="legend-unit">{result.dataset.unit}</span></div>
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [lang, setLang] = useState<Lang>("en");
  const [regionId, setRegionId] = useState("ayeyarwady");
  const [regionSearch, setRegionSearch] = useState("Ayeyarwady — Region");
  const [catalog, setCatalog] = useState<ExploreCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [activeTopic, setActiveTopic] = useState<TopicId>("agriculture");
  const [openTopic, setOpenTopic] = useState<TopicId | null>("agriculture");
  const [indicatorLabel, setIndicatorLabel] = useState("");
  const [detailIndicator, setDetailIndicator] = useState<TopicIndicator | null>(null);
  const [datasetId, setDatasetId] = useState("");
  const [start, setStart] = useState(questionDate(36));
  const [end, setEnd] = useState(questionDate(7));
  const [chartState, setChartState] = useState<ChartState>("initial");
  const [result, setResult] = useState<ObservationResponse | null>(null);
  const [chartError, setChartError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [focusChatOnHome, setFocusChatOnHome] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    fetchExploreCatalog(controller.signal)
      .then(setCatalog)
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setCatalogError(cause.message || "Could not load the data catalogue.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDetailIndicator(null);
  }, [activeTopic]);

  useEffect(() => {
    if (view !== "home" || !focusChatOnHome) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("ask-ai")?.scrollIntoView({ behavior: "smooth", block: "center" });
      chatInputRef.current?.focus({ preventScroll: true });
      setFocusChatOnHome(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusChatOnHome, view]);

  const datasets = useMemo(() => catalog?.datasets.filter((item) => item.topicId === activeTopic) ?? [], [catalog, activeTopic]);
  const selectedDataset = datasets.find((item) => item.id === datasetId);

  useEffect(() => {
    if (!catalog || datasetId) return;
    const firstAvailable = catalog.datasets.find((dataset) => dataset.topicId === activeTopic && dataset.available);
    if (firstAvailable) setDatasetId(firstAvailable.id);
  }, [activeTopic, catalog, datasetId]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      if (view !== "explore") {
        setResult(null);
        setChartState("initial");
        return;
      }
      if (!catalog) {
        setResult(null);
        setChartState(catalogError ? "error" : "initial");
        if (catalogError) setChartError(catalogError);
        return;
      }
      if (!datasets.some((dataset) => dataset.available)) {
        setResult(null);
        setChartState("unavailable");
        return;
      }
      if (!catalog || !datasetId || !regionId || !selectedDataset) {
        setResult(null);
        setChartState(selectedDataset?.available === false ? "unavailable" : "initial");
        return;
      }
      if (!selectedDataset.available) {
        setResult(null);
        setChartState("unavailable");
        return;
      }
      if (!start || !end || start > end) {
        setResult(null);
        setChartState("error");
        setChartError("Choose a valid date range. Start date must be on or before end date.");
        return;
      }

      setChartState("loading");
      setChartError("");
      setResult(null);
      try {
        const data = await fetchObservations({ topicId: activeTopic, regionId, datasetId, start, end }, controller.signal);
        if (controller.signal.aborted) return;
        setResult(data);
        setChartState(data.summary.count === 0 ? "empty" : "ready");
      } catch (cause) {
        if (controller.signal.aborted) return;
        setResult(null);
        const message = (cause as Error).message || "Could not retrieve observations.";
        setChartError(message);
        setChartState(message.includes("not connected") || message.includes("unavailable") ? "unavailable" : "error");
      }
    };
    void run();
    return () => controller.abort();
  }, [activeTopic, catalog, catalogError, datasetId, datasets, end, regionId, selectedDataset, start, reloadToken, view]);

  function chooseTopic(topicId: TopicId) {
    // Pressing the open category again collapses it.
    if (openTopic === topicId) {
      setOpenTopic(null);
      return;
    }
    setOpenTopic(topicId);
    setActiveTopic(topicId);
    setIndicatorLabel("");
    setDetailIndicator(null);
    const first = catalog?.datasets.find((dataset) => dataset.topicId === topicId && dataset.available);
    setDatasetId(first?.id ?? "");
    setResult(null);
  }

  function chooseIndicator(indicator: TopicIndicator) {
    setIndicatorLabel(indicator.label);
    setDetailIndicator((current) => (current ? indicator : current));
    const dataset = catalog?.datasets.find((item) => item.id === indicator.datasetId);
    if (dataset?.available) chooseDataset(dataset.id);
  }

  function chooseDataset(nextId: string) {
    setDatasetId(nextId);
    if (nextId === "fire-detections") {
      setStart(questionDate(9));
      setEnd(questionDate(0));
    }
  }

  function chooseRegion(regionId: string) {
    const region = REGIONS.find((item) => item.id === regionId);
    if (!region) return;
    setRegionId(region.id);
    setRegionSearch(`${region.name} — ${region.type}`);
  }

  function askAI() {
    setFocusChatOnHome(true);
    setView("home");
  }

  const activeTopicData = TOPICS.find((item) => item.id === activeTopic);
  const selectedRegion = REGIONS.find((item) => item.id === regionId);
  const dateError = Boolean(start && end && start > end);

  return (
    <main className="earthlens-app" lang={lang}>
      <header className="site-header">
        <a className="brand-lockup" href="#home" onClick={(event) => { event.preventDefault(); setView("home"); }} aria-label="Myanmar EarthLens home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-text"><strong>Myanmar EarthLens</strong><small>Explore with evidence</small></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          {(["home", "explore"] as const).map((page) => (
            <button key={page} className={view === page ? "nav-link nav-link-active" : "nav-link"} aria-current={view === page ? "page" : undefined} onClick={() => setView(page)}>
              {page === "home" ? "Home" : "Explore Map"}
            </button>
          ))}
        </nav>
        <div className="language-switch" role="group" aria-label="Interface language">
          {(["en", "my"] as const).map((language) => (
            <button key={language} aria-pressed={lang === language} className={lang === language ? "language-active" : ""} onClick={() => setLang(language)}>
              {language === "en" ? "EN" : "မြန်မာ"}
            </button>
          ))}
        </div>
      </header>

      {view === "home" ? (
        <div className="page-shell">
          <section className="home-hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <span className="hero-kicker"><span className="kicker-dot" /> Earth observation for Myanmar</span>
              <h1 id="hero-title">Myanmar<br /><span>EarthLens</span></h1>
              <p className="hero-slogan">Understand Myanmar.<br />Discover Change.</p>
              <p className="hero-description">
                Explore agriculture, disasters, environmental change, infrastructure, water, and energy across Myanmar. Discover township-level insights through Earth observation data, interactive charts, and AI-assisted explanations.
              </p>
              <div className="hero-actions">
                <button className="button-primary" onClick={() => setView("explore")}>Explore Map <ArrowRight size={17} /></button>
                <button className="button-secondary" onClick={askAI}><MessageCircle size={16} /> Ask AI <ArrowDownRight size={15} /></button>
              </div>
              <div className="hero-note"><MapPin size={15} /> 14 state and region boundaries bundled locally</div>
            </div>

            <section className="home-map-card panel" aria-labelledby="home-map-title">
              <div className="map-card-heading">
                <div><p className="eyebrow">Explore the landscape</p><h2 id="home-map-title">Myanmar — States and Regions</h2></div>
                <span className="map-heading-icon"><MapPin size={17} /></span>
              </div>
              <MyanmarMap selectedRegionId={regionId} onSelectRegion={chooseRegion} language={lang} />
              <div className="map-card-footer">
                <span><i className="map-key map-key-pastel" /> States &amp; regions</span>
                <span><i className="map-key map-key-city" /> Major cities</span>
                <small>Boundaries: Natural Earth 1:10m Admin-1, public domain · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Attribution <ExternalLink size={11} /></a></small>
              </div>
            </section>
          </section>

          <section className="home-data-note" aria-label="Geographic coverage notice">
            <div className="note-icon"><MapPin size={18} /></div>
            <p><strong>Township boundaries are not available in this workspace.</strong> The bundled map shows verified state and region boundaries. Current NASA chart data is sampled at regional reference points, not township averages.</p>
            <button className="text-button" onClick={() => setView("explore")}>View data coverage <ArrowRight size={14} /></button>
          </section>

          <ChatPanel lang={lang} selectedRegionId={regionId} inputRef={chatInputRef} />
          <footer className="site-footer">
            <span>Myanmar EarthLens · Evidence first, limitations included</span>
            <a href="/earthlens.html">Open the original dashboard preview <ExternalLink size={13} /></a>
          </footer>
        </div>
      ) : (
        <div className="page-shell explore-shell">
          <div className="page-heading">
            <div><p className="eyebrow">Explore Myanmar</p><h1>Map &amp; data workspace</h1><p>Choose a topic, then view a connected observation series and its source details.</p></div>
            <button className="button-secondary" onClick={askAI}><MessageCircle size={16} /> Ask AI</button>
          </div>
          <div className="explore-grid">
            <aside className="topic-rail" aria-label="Explore by topic">
              {TOPICS.map((topic) => {
                const Icon = topicIcons[topic.id];
                const active = activeTopic === topic.id;
                const open = openTopic === topic.id;
                return (
                  <div key={topic.id} className="rail-item">
                    <button
                      type="button"
                      className={active ? "rail-topic-button rail-topic-button-active" : "rail-topic-button"}
                      aria-pressed={active}
                      aria-expanded={open}
                      aria-controls={`rail-indicators-${topic.id}`}
                      onClick={() => chooseTopic(topic.id)}
                    >
                      <span className="topic-icon-tile"><Icon size={20} aria-hidden="true" /></span>
                      <span className="rail-topic-name">{topic.label}</span>
                    </button>
                    {open && (
                      <div id={`rail-indicators-${topic.id}`} className="rail-indicators" aria-label={`${topic.label} indicators`}>
                        {topic.indicators.map((indicator) => {
                          const dataset = catalog?.datasets.find((item) => item.id === indicator.datasetId);
                          const chosen = indicatorLabel === indicator.label;
                          return (
                            <div key={indicator.label} className={chosen ? "rail-indicator rail-indicator-active" : "rail-indicator"}>
                              <button type="button" className="rail-indicator-title" aria-pressed={chosen} onClick={() => chooseIndicator(indicator)}>
                                {indicator.label}
                                {dataset && !dataset.available && <span className="rail-indicator-tag">not connected</span>}
                                {!indicator.datasetId && <span className="rail-indicator-tag">not connected</span>}
                              </button>
                              <button
                                type="button"
                                className="see-more-link"
                                aria-pressed={detailIndicator?.label === indicator.label}
                                onClick={() => {
                                  chooseIndicator(indicator);
                                  setDetailIndicator(indicator);
                                }}
                              >
                                See more <ArrowUpRight size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </aside>

            <section className="map-column" aria-label="Map">
              <section className="map-stage panel" aria-labelledby="map-stage-title">
                <div className="panel-title-row"><div><p className="eyebrow">Myanmar</p><h2 id="map-stage-title">Select an area on the map</h2></div><MapPin size={17} /></div>
                <div className="map-stage-figure">
                  <MyanmarMap selectedRegionId={regionId} onSelectRegion={chooseRegion} language={lang} />
                </div>
                <p className="map-stage-note">
                  {selectedRegion
                    ? `Active area: ${selectedRegion.name} — ${selectedRegion.type}. Observations use its regional reference point.`
                    : "Select a mapped state or region to set the regional reference point. Township boundaries are not available."}
                </p>
              </section>
            </section>

            <aside className="data-column" aria-label="Data selection and details">
              <div className="selection-panel panel">
                <div className="panel-title-row selection-title"><div><p className="eyebrow">Build your view</p><h2>Data workspace</h2></div><span className="live-tag"><span className="status-dot" /> Live source</span></div>
                <div className="selection-grid">
                  <div className="field-control">
                    <label htmlFor="township-unavailable">Select Township</label>
                    <select id="township-unavailable" disabled aria-describedby="township-help"><option>No verified township records available</option></select>
                    <p className="field-hint" id="township-help">Township lookup is unavailable until verified township records are added.</p>
                  </div>
                  <div className="field-control">
                    <label htmlFor="regional-reference">Regional reference point <span className="field-meta">(not a township)</span></label>
                    <input
                      id="regional-reference"
                      list="region-options"
                      value={regionSearch}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRegionSearch(value);
                        const match = REGIONS.find((region) => `${region.name} — ${region.type}` === value || `${region.nameMy} — ${region.type}` === value);
                        if (match) setRegionId(match.id);
                        else setRegionId("");
                      }}
                      onBlur={() => {
                        const match = REGIONS.find((region) => `${region.name} — ${region.type}` === regionSearch || `${region.nameMy} — ${region.type}` === regionSearch);
                        if (!match) {
                          const fallback = REGIONS.find((region) => region.id === regionId);
                          if (fallback) setRegionSearch(`${fallback.name} — ${fallback.type}`);
                        }
                      }}
                      placeholder="Search a state or region"
                      aria-describedby="region-help"
                    />
                    <datalist id="region-options">{REGIONS.flatMap((region) => [
                      <option key={`${region.id}-en`} value={`${region.name} — ${region.type}`} />,
                      <option key={`${region.id}-my`} value={`${region.nameMy} — ${region.type}`} />,
                    ])}</datalist>
                    <p className="field-hint" id="region-help">15 bundled regional reference locations; observations are point samples.</p>
                  </div>
                  <div className="field-control">
                    <label htmlFor="dataset-select">Select data</label>
                    <select id="dataset-select" value={datasetId} onChange={(event) => chooseDataset(event.target.value)} disabled={!datasets.length}>
                      <option value="">Choose a dataset</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id} disabled={!dataset.available}>
                          {dataset.label} ({dataset.unit}){dataset.available ? "" : " — unavailable"}
                        </option>
                      ))}
                    </select>
                    {selectedDataset && !selectedDataset.available && <p className="field-hint">{selectedDataset.reason}</p>}
                    {!datasets.length && <p className="field-hint">No datasets are listed for this topic.</p>}
                  </div>
                  <div className="field-control">
                    <label>Date range <span className="field-meta">(UTC)</span></label>
                    <div className="date-range">
                      <div><label className="sr-only" htmlFor="start-date">Start date</label><input id="start-date" type="date" min="1981-01-01" max={questionDate(0)} value={start} onChange={(event) => setStart(event.target.value)} /></div>
                      <span aria-hidden="true">to</span>
                      <div><label className="sr-only" htmlFor="end-date">End date</label><input id="end-date" type="date" min="1981-01-01" max={questionDate(0)} value={end} onChange={(event) => setEnd(event.target.value)} /></div>
                    </div>
                    {dateError && <p className="field-error" role="alert">Start date must be on or before end date.</p>}
                    {datasetId === "fire-detections" && <p className="field-hint">NASA FIRMS supports up to 10 recent days ending today.</p>}
                  </div>
                </div>
                {catalogError && <div className="inline-notice notice-error" role="alert">{catalogError}</div>}
              </div>

              <section className="chart-card panel" aria-labelledby="chart-title">
                <div className="panel-title-row chart-heading">
                  <div><p className="eyebrow">Observation series</p><h2 id="chart-title">{selectedDataset?.label ?? "Dataset chart"}</h2><p>{selectedRegion?.name ?? "Select a regional reference point"} · {start} — {end}</p></div>
                  <ChartNoAxesCombined className="chart-heading-icon" size={21} />
                </div>
                <DataChart state={chartState} result={result} error={chartError} onRetry={() => setReloadToken((token) => token + 1)} />
                {result && result.summary.count > 0 && (
                  <div className="chart-stats">
                    <div><span>Mean</span><strong>{formatValue(result.summary.mean)} <small>{result.dataset.unit}</small></strong></div>
                    <div><span>Minimum</span><strong>{formatValue(result.summary.min)} <small>{result.dataset.unit}</small></strong></div>
                    <div><span>Maximum</span><strong>{formatValue(result.summary.max)} <small>{result.dataset.unit}</small></strong></div>
                    <div><span>Observations</span><strong>{result.summary.count}<small> / {result.observations.length}</small></strong></div>
                  </div>
                )}
              </section>

              <section className="detail-card panel" aria-labelledby="detail-title">
                <div className="panel-title-row"><div><p className="eyebrow">Sources &amp; context</p><h2 id="detail-title">Detailed info</h2></div><ExternalLink size={17} /></div>
                {detailIndicator ? (
                  <div className="indicator-detail">
                    <div className="indicator-detail-head">
                      <h3>{detailIndicator.label}</h3>
                      <button type="button" className="text-button" onClick={() => setDetailIndicator(null)}>Back to observation details</button>
                    </div>
                    <p>{detailIndicator.summary}</p>
                    {(() => {
                      const dataset = catalog?.datasets.find((item) => item.id === detailIndicator.datasetId);
                      if (!dataset) return <p className="field-hint">No dataset is catalogued for this indicator, so no observations can be shown.</p>;
                      return (
                        <dl className="detail-grid">
                          <div><dt>Dataset</dt><dd>{dataset.label}</dd></div>
                          <div><dt>Unit</dt><dd>{dataset.unit}</dd></div>
                          <div><dt>Status</dt><dd>{dataset.available ? "Connected" : dataset.reason ?? "Not connected"}</dd></div>
                          <div><dt>Source</dt><dd>{dataset.source.url
                            ? <a href={dataset.source.url} target="_blank" rel="noreferrer">{dataset.source.name}<ExternalLink size={11} /></a>
                            : dataset.source.name}</dd></div>
                          <div className="detail-full"><dt>What it measures</dt><dd>{dataset.description}</dd></div>
                          <div className="detail-full"><dt>Limitations</dt><dd>{dataset.limitations}</dd></div>
                        </dl>
                      );
                    })()}
                  </div>
                ) : result ? (
                  <dl className="detail-grid">
                    <div><dt>Area</dt><dd>{result.region.name}, {REGIONS.find((item) => item.id === result.region.id)?.type ?? "region"}</dd></div>
                    <div><dt>Topic</dt><dd>{activeTopicData?.label}</dd></div>
                    <div><dt>Dataset</dt><dd>{result.dataset.label}</dd></div>
                    <div><dt>Observation period</dt><dd>{result.period.start} — {result.period.end}</dd></div>
                    <div><dt>Units &amp; source</dt><dd>{result.dataset.unit} · <a href={result.source.url} target="_blank" rel="noreferrer">{result.source.name}<ExternalLink size={11} /></a></dd></div>
                    <div><dt>Latest available value</dt><dd>{formatValue(result.summary.latest)} {result.dataset.unit}</dd></div>
                    <div><dt>Geographic coverage</dt><dd>{result.geographicCoverage}</dd></div>
                    <div><dt>Data received</dt><dd>{new Date(result.observedAt).toLocaleString()}</dd></div>
                    {result.missingCount > 0 && <div><dt>Missing observations</dt><dd>{result.missingCount} shown as gaps, not zeros</dd></div>}
                    <div className="detail-full"><dt>Plain-language reading</dt><dd>{result.dataset.description}. Summary statistics use only available observations; they do not imply a township-wide condition.</dd></div>
                    <div className="detail-full"><dt>Limitations</dt><dd>{result.dataset.limitations}</dd></div>
                  </dl>
                ) : (
                  <div className="detail-placeholder">{chartState === "loading" ? "Source and coverage details will appear with the observations." : "Select a connected dataset and regional reference point to see source metadata, observation period and limitations."}</div>
                )}
              </section>

              <div className="coverage-card">
                <div className="coverage-heading"><MapPin size={16} /><strong>Coverage note</strong></div>
                <p>{catalog?.townshipCoverage.reason ?? "No verified township records are bundled. Available point observations use region reference locations."}</p>
                <span>Township coverage: unavailable</span>
              </div>
            </aside>
          </div>
          <footer className="site-footer"><span>Natural Earth admin-1 boundaries · NASA POWER daily · NASA FIRMS when configured</span><a href="/earthlens.html">Original dashboard preview <ExternalLink size={13} /></a></footer>
        </div>
      )}
    </main>
  );
}
