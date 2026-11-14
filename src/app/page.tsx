"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
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
import { observationDateError } from "@/features/explorer/dates";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { EarthbeatExperience } from "@/features/explorer/components/EarthbeatExperience";
import { ChatPanel } from "@/features/explorer/components/ChatPanel";
import { MyanmarMap } from "@/features/explorer/components/MyanmarMap";
import { fetchExploreCatalog, fetchObservations, type ExploreCatalog, type ObservationResponse } from "@/features/explorer/client/data-service";
import { TOPICS, type TopicId, type TopicIndicator } from "@/features/explorer/catalog";

import { ReferenceHome } from "./reference-home";

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

function DataChart({ state, result, error, onRetry }: { state: ChartState; result: ObservationResponse | null; error: string; onRetry: () => void }) {
  if (state === "loading") {
    return <div className="chart-state" role="status"><LoaderCircle className="spin" size={24} /> Retrieving observations from the configured data service…</div>;
  }
  if (state === "initial") {
    return <div className="chart-state"><ChartNoAxesCombined size={25} /> Select an area on the map, then a connected dataset and date range, to view observations.</div>;
  }
  if (state === "unavailable") {
    return <div className="chart-state chart-unavailable"><Radio size={24} /> {error || "No observation data is available for this selection. The home preview contains illustrative figures, not measured data."}</div>;
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
      ) : <EarthbeatExperience result={result} />}
      <div className="chart-legend"><span className="legend-line" />{result.dataset.description}<span className="legend-unit">{result.dataset.unit}</span></div>
    </div>
  );
}

export default function Page() {
  const [townshipId,setTownshipId] = useState("");
  const [mapFocused,setMapFocused] = useState(false);
  const [chatOpen,setChatOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [lang, setLang] = useState<Lang>("en");
  const [regionId, setRegionId] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [catalog, setCatalog] = useState<ExploreCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [activeTopic, setActiveTopic] = useState<TopicId>("agriculture");
  const [openTopic, setOpenTopic] = useState<TopicId | null>(null);
  const [indicatorLabel, setIndicatorLabel] = useState("");
  const [detailIndicator, setDetailIndicator] = useState<TopicIndicator | null>(null);
  const [datasetId, setDatasetId] = useState("");
  const [start, setStart] = useState(questionDate(36));
  const [end, setEnd] = useState(questionDate(7));
  const [draftStart,setDraftStart] = useState(questionDate(36));
  const [draftEnd,setDraftEnd] = useState(questionDate(7));
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
    if (!catalog || datasets.some(item => item.id === datasetId) || datasetId.startsWith("unconnected:")) return;
    const firstAvailable = datasets.find(dataset => dataset.available && dataset.parameter) ?? datasets.find(dataset => dataset.available);
    if (firstAvailable) {
      setDatasetId(firstAvailable.id);
      if (firstAvailable.defaultPeriod) {
        const period = firstAvailable.defaultPeriod;
        setStart(period.start); setEnd(period.end);
        setDraftStart(period.start); setDraftEnd(period.end);
      }
    }
  }, [activeTopic, catalog, datasetId, datasets]);

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
        setChartError(selectedDataset?.reason || "No observation data is available for this indicator in the project. The home preview contains illustrative figures only.");
        return;
      }
      if (!catalog || !datasetId || !regionId || !selectedDataset) {
        setResult(null);
        setChartState(!datasetId || !regionId ? "initial" : "unavailable");
        if (!regionId) setChartError("");
        return;
      }
      if (!selectedDataset.available) {
        setResult(null);
        setChartState("unavailable");
        setChartError(selectedDataset?.reason || "No observation data is available for this indicator in the project. The home preview contains illustrative figures only.");
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
        const data = await fetchObservations({ topicId: activeTopic, regionId, datasetId, start, end, townshipId:townshipId || undefined }, controller.signal);
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
  }, [activeTopic, catalog, catalogError, datasetId, datasets, end, regionId, selectedDataset, start, reloadToken, view, townshipId]);

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
    const choices = catalog?.datasets.filter(dataset => dataset.topicId === topicId) ?? [];
    const first = choices.find(dataset => dataset.available && dataset.parameter) ?? choices.find(dataset => dataset.available);
    chooseDataset(first?.id ?? "");
    setResult(null);
  }

  function chooseIndicator(indicator: TopicIndicator) {
    setIndicatorLabel(indicator.label);
    setDetailIndicator((current) => (current ? indicator : current));
    chooseDataset(indicator.datasetId || `unconnected:${indicator.label}`);
  }

  function chooseDataset(nextId: string) {
    setDatasetId(nextId);
    const period = catalog?.datasets.find(dataset => dataset.id === nextId)?.defaultPeriod;
    if (period) {
      setStart(period.start); setEnd(period.end);
      setDraftStart(period.start); setDraftEnd(period.end);
    }
    if (nextId === "fire-detections") {
      setStart(questionDate(6));
      setEnd(questionDate(0));
      setDraftStart(questionDate(6));
      setDraftEnd(questionDate(0));
    }
  }

  function chooseRegion(nextRegionId: string) {
    const region = REGIONS.find((item) => item.id === nextRegionId);
    setTownshipId("");
    if (!region) {
      setRegionId("");
      setRegionSearch("");
      setMapFocused(false);
      return;
    }
    if (region.id === regionId) {
      setRegionId("");
      setRegionSearch("");
      setMapFocused(false);
      return;
    }
    setMapFocused(true);
    setRegionId(region.id);
    setRegionSearch(`${region.name} — ${region.type}`);
  }

  function chooseTownship(nextTownshipId: string) {
    // Clicking the selected township again steps back out to its state or region.
    if (nextTownshipId && nextTownshipId === townshipId) {
      setTownshipId("");
      return;
    }
    setTownshipId(nextTownshipId);
    setMapFocused(true);
  }

  function askAI() {
    if (view === "explore") {setChatOpen(true);return;}
    setFocusChatOnHome(true);
    setView("home");
  }

  const activeTopicData = TOPICS.find((item) => item.id === activeTopic);
  const selectedRegion = REGIONS.find((item) => item.id === regionId);
  const selectedTownship = catalog?.townships.find(item=>item.id===townshipId);
  const dateError = observationDateError(draftStart,draftEnd);

  if (view === "home") return <ReferenceHome onExplore={(topic) => { if (topic) setActiveTopic(topic); setView("explore"); }} onAsk={() => { setView("explore"); setChatOpen(true); }} onRegion={(id) => { chooseRegion(id); setView("explore"); }} />;

  return (
    <main className={`earthlens-app${view === "explore" ? " is-exploring" : ""}`} lang={lang}>
      <header className="site-header">
        <a className="brand-lockup" href="#home" onClick={(event) => { event.preventDefault(); setView("home"); }} aria-label="Myanmar EarthLens home">
          <img className="earthlens-brand-art" src="/home-exact/brand.svg" alt="" />
          <span className="brand-text"><strong>Earth Trend Detective</strong><small>MYANMAR EARTH INTELLIGENCE</small></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          {(["home", "explore"] as const).map((page) => (
            <button key={page} className={view === page ? "nav-link nav-link-active" : "nav-link"} aria-current={view === page ? "page" : undefined} onClick={() => setView(page)}>
              {page === "home" ? "Home" : "Explore Map"}
            </button>
          ))}
          <button className="nav-link" onClick={askAI}>AI Assistant</button>
        </nav>
        <div className="language-switch" role="group" aria-label="Interface language">
          {(["en", "my"] as const).map((language) => (
            <button key={language} aria-pressed={lang === language} className={lang === language ? "language-active" : ""} onClick={() => setLang(language)}>
              {language === "en" ? "EN" : "မြန်မာ"}
            </button>
          ))}
        </div>
      </header>

      {(
        <div className="page-shell explore-shell">
          <div className="page-heading">
            <div><p className="eyebrow">Explore Myanmar</p><h1>Map &amp; data workspace</h1><p>Choose a topic, then view a connected observation series and its source details.</p></div>
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
                                {dataset && !dataset.available && <span className="rail-indicator-tag">{dataset.setupRequired ? "finish setup" : "access needed"}</span>}
                                {!indicator.datasetId && <span className="rail-indicator-tag">no data yet</span>}
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
              <section className="map-stage panel" aria-label="Select an area on the map">
                <div className="map-stage-figure">
                  <MyanmarMap selectedRegionId={regionId} onSelectRegion={chooseRegion} language={lang} focusRegion={mapFocused} townships={catalog?.townships} selectedTownshipId={townshipId} onSelectTownship={chooseTownship} />
                </div>
                <p className="map-stage-note">
                  {selectedRegion
                    ? `Active area: ${selectedTownship?.name ?? selectedRegion.name} — ${selectedTownship ? "Township" : selectedRegion.type}. Observations use a representative point, not an area average.`
                    : "Select a mapped state or region to set the regional reference point. Select a region to reveal its township boundaries."}
                </p>
              </section>
            </section>

            <aside className="data-column" aria-label="Data selection and details">
              <div className="selection-panel panel">
                <div className="panel-title-row selection-title"><div><p className="eyebrow">Build your view</p><h2>Data workspace</h2></div><span className="live-tag"><span className="status-dot" /> {chartState === "ready" ? "Observations loaded" : selectedDataset?.available ? "Data source available" : "No data available"}</span></div>
                <div className="selection-grid">
                  <div className="field-control">
                    <label htmlFor="township-select">Select Township</label>
                    <select id="township-select" value={townshipId} disabled={!regionId || !catalog?.townships.length} onChange={event=>{setTownshipId(event.target.value);setMapFocused(true);}} aria-describedby="township-help"><option value="">All townships in this region</option>{catalog?.townships.filter(item=>item.regionId===regionId).map(item=><option key={item.id} value={item.id}>{lang==="my"?item.nameMy:item.name}</option>)}</select>
                    <p className="field-hint" id="township-help">Selecting a township reloads NASA POWER at a point inside its boundary. Nearby townships may share the same NASA grid cell.</p>
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
                        if (match) chooseRegion(match.id);
                        else {setRegionId("");setTownshipId("");setMapFocused(false);}
                      }}
                      onBlur={() => {
                        const match = REGIONS.find((region) => `${region.name} — ${region.type}` === regionSearch || `${region.nameMy} — ${region.type}` === regionSearch);
                        if (!match) {
                          const fallback = REGIONS.find((region) => region.id === regionId);
                          setRegionSearch(fallback ? `${fallback.name} — ${fallback.type}` : "");
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
                        <option key={dataset.id} value={dataset.id}>
                          {dataset.label} ({dataset.unit}){dataset.available ? "" : dataset.setupRequired ? " — finish setup" : " — access needed"}
                        </option>
                      ))}
                    </select>
                    {selectedDataset && !selectedDataset.available && <p className="field-hint">{selectedDataset.reason}</p>}
                    {selectedDataset?.coverage && <p className="field-hint">Published archive: {selectedDataset.coverage.start} to {selectedDataset.coverage.end}. {selectedDataset.temporalResolution}. Selecting this dataset opens a suitable historical range.</p>}
                    {!datasets.length && <p className="field-hint">No datasets are listed for this topic.</p>}
                  </div>
                  <div className="field-control">
                    <label>Date range <span className="field-meta">(UTC)</span></label>
                    <div className="date-range">
                      <div><label className="sr-only" htmlFor="start-date">Start date</label><input id="start-date" type="date" min="1981-01-01" max={questionDate(0)} value={draftStart} onChange={(event) => setDraftStart(event.target.value)} /></div>
                      <span aria-hidden="true">to</span>
                      <div><label className="sr-only" htmlFor="end-date">End date</label><input id="end-date" type="date" min="1981-01-01" max={questionDate(0)} value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} /></div>
                    </div>
                    <div className="date-actions"><button type="button" className="button-primary" disabled={Boolean(dateError)} onClick={()=>{if(!dateError){setStart(draftStart);setEnd(draftEnd);setReloadToken(token=>token+1);}}}>Apply dates</button>{datasetId !== "fire-detections" && <button type="button" className="text-button" onClick={()=>{setDraftStart("1989-01-01");setDraftEnd(questionDate(0));}}>1989–today</button>}</div>
                    {dateError ? <p className="field-error" role="status">{dateError}</p> : <p className="field-hint">Apply your dates to update the graph. Recent days may not have published observations yet.</p>}
                    {datasetId === "fire-detections" && <p className="field-hint">NASA FIRMS supports up to 10 recent days ending today.</p>}
                  </div>
                </div>
                {catalogError && <div className="inline-notice notice-error" role="alert">{catalogError}</div>}
              </div>

              <section className="chart-card panel" aria-labelledby="chart-title">
                <div className="panel-title-row chart-heading">
                  <div><p className="eyebrow">Observation series</p><h2 id="chart-title">{selectedDataset?.label ?? "Dataset chart"}</h2><p>{selectedTownship?.name ?? selectedRegion?.name ?? "Select a location"} · {start} — {end}</p></div>
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
                    <div><dt>Area</dt><dd>{result.location?.name ?? result.region.name}, {result.location?.type ?? "region"}</dd></div>
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
                <p>{catalog?.townshipCoverage.reason ?? "Township boundaries support selection. NASA POWER uses the selected township or regional representative point."}</p>
                <span>Township map coverage: available · Measurements: selected representative point</span>
              </div>
            </aside>
          </div>
          <button type="button" className="explore-back" onClick={() => {
            if (townshipId) setTownshipId("");
            else if (mapFocused) setMapFocused(false);
            else { setChatOpen(false); setView("home"); }
          }} aria-label={townshipId ? "Back to region" : mapFocused ? "Back to all regions" : "Back to Home"}>
            <ArrowLeft size={16} aria-hidden="true" />{lang === "my" ? "နောက်သို့" : "Back"}
            <span>{townshipId ? "To region" : mapFocused ? "All regions" : "Home"}</span>
          </button>
          <footer className="site-footer"><span>Natural Earth admin-1 boundaries · NASA POWER daily · NASA FIRMS when configured</span><a href="/earthlens.html">Original dashboard preview <ExternalLink size={13} /></a></footer>
        </div>
      )}
      {view === "explore" && <><button className="floating-ai-launcher button-primary" aria-expanded={chatOpen} aria-controls="floating-ai-panel" onClick={()=>setChatOpen(open=>!open)}><MessageCircle size={18}/> AI chat</button>{chatOpen && <section id="floating-ai-panel" className="floating-ai-panel" role="dialog" aria-label="EarthLens AI chat" onKeyDown={event=>{if(event.key==="Escape")setChatOpen(false);}}><button className="floating-ai-close button-secondary" onClick={()=>setChatOpen(false)} autoFocus>Close chat</button><ChatPanel lang={lang} selectedRegionId={regionId} inputRef={chatInputRef}/></section>}</>}
    </main>
  );
}
