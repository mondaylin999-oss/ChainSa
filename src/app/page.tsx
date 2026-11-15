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
import { INDICATOR_MY, LIMITATION_MY, TOPIC_MY, UI, spatialBasisMy } from "@/features/explorer/i18n";

/** Burmese name of a dataset, from the sidebar indicator that uses it. */
const DATASET_MY = Object.fromEntries(TOPICS.flatMap(t => t.indicators.filter(i => i.datasetId && INDICATOR_MY[i.label]).map(i => [i.datasetId!, INDICATOR_MY[i.label].label])));

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

function DataChart({ state, result, error, onRetry, lang }: { state: ChartState; result: ObservationResponse | null; error: string; onRetry: () => void; lang: Lang }) {
  const T = UI[lang];
  if (state === "loading") {
    return <div className="chart-state" role="status"><LoaderCircle className="spin" size={24} /> {T.loading}</div>;
  }
  if (state === "initial") {
    return <div className="chart-state"><ChartNoAxesCombined size={25} /> {T.initial}</div>;
  }
  if (state === "unavailable") {
    return <div className="chart-state chart-unavailable"><Radio size={24} /> {error || T.unavailable}</div>;
  }
  if (state === "error") {
    return <div className="chart-state chart-error" role="alert"><TriangleAlert size={24} /><span>{error || T.errorTitle}<button className="text-button" onClick={onRetry}>{T.retry}</button></span></div>;
  }
  if (state === "empty" || !result) {
    return <div className="chart-state">{T.empty}</div>;
  }
  return (
    <div className="chart-plot">
      {result.summary.count === 0 ? (
        <div className="chart-state">{T.noValid}</div>
      ) : <EarthbeatExperience result={result} />}
      <div className="chart-legend"><span className="legend-line" />{lang === "my" ? DATASET_MY[result.dataset.id] ?? result.dataset.description : result.dataset.description}<span className="legend-unit">{result.dataset.unit}</span></div>
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

  function askAI() {
    if (view === "explore") {setChatOpen(true);return;}
    setFocusChatOnHome(true);
    setView("home");
  }

  const activeTopicData = TOPICS.find((item) => item.id === activeTopic);
  const T = UI[lang];
  const tr = (en: string, my: string) => (lang === "my" ? my : en);
  const topicName = (id: string, en: string) => (lang === "my" ? TOPIC_MY[id] ?? en : en);
  const indicatorName = (ind: TopicIndicator) => (lang === "my" ? INDICATOR_MY[ind.label]?.label ?? ind.label : ind.label);
  const indicatorSummary = (ind: TopicIndicator) => (lang === "my" ? INDICATOR_MY[ind.label]?.summary ?? ind.summary : ind.summary);
  const datasetName = (id: string, en: string) => (lang === "my" ? DATASET_MY[id] ?? en : en);
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
          <button type="button" className="explore-back" onClick={() => {
            if (townshipId) setTownshipId("");
            else if (mapFocused) setMapFocused(false);
            else { setChatOpen(false); setView("home"); }
          }} aria-label={townshipId ? "Back to region" : mapFocused ? "Back to all regions" : "Back to Home"}>
            <ArrowLeft size={16} aria-hidden="true" />{lang === "my" ? "နောက်သို့" : "Back"}
            <span>{townshipId ? T.toRegion : mapFocused ? T.allRegions : T.home}</span>
          </button>
          <div className="page-heading">
            <div><p className="eyebrow">{T.eyebrow}</p><h1>{T.title}</h1><p>{T.intro}</p></div>
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
                      <span className="rail-topic-name">{topicName(topic.id, topic.label)}</span>
                    </button>
                    {open && (
                      <div id={`rail-indicators-${topic.id}`} className="rail-indicators" aria-label={`${topic.label} indicators`}>
                        {topic.indicators.map((indicator) => {
                          const dataset = catalog?.datasets.find((item) => item.id === indicator.datasetId);
                          const chosen = indicatorLabel === indicator.label;
                          return (
                            <div key={indicator.label} className={chosen ? "rail-indicator rail-indicator-active" : "rail-indicator"}>
                              <button type="button" className="rail-indicator-title" aria-pressed={chosen} onClick={() => chooseIndicator(indicator)}>
                                {indicatorName(indicator)}
                                {dataset && !dataset.available && <span className="rail-indicator-tag">{dataset.setupRequired ? T.finishSetup : T.accessNeeded}</span>}
                                {!indicator.datasetId && <span className="rail-indicator-tag">{T.noData}</span>}
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
                                {T.seeMore} <ArrowUpRight size={12} />
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
                  <MyanmarMap selectedRegionId={regionId} onSelectRegion={chooseRegion} language={lang} focusRegion={mapFocused} townships={catalog?.townships} selectedTownshipId={townshipId} onSelectTownship={id=>{setTownshipId(id);setMapFocused(true);}} />
                </div>
                <p className="map-stage-note">
                  {selectedRegion
                    ? tr(`Active area: ${selectedTownship?.name ?? selectedRegion.name} — ${selectedTownship ? "Township" : selectedRegion.type}. Each result states whether it is a point, a pixel window, a river reach or a whole-area value.`, `ရွေးထားသော နေရာ - ${selectedTownship?.nameMy ?? selectedRegion.nameMy}။ ရလဒ်တစ်ခုစီတွင် အမှတ်၊ pixel ဝင်းဒိုး၊ မြစ်အပိုင်း သို့မဟုတ် နယ်မြေတစ်ခုလုံး တန်ဖိုး ဖြစ်ကြောင်း ဖော်ပြထားသည်။`)
                    : tr("Select a mapped state or region to set the regional reference point. Select a region to reveal its township boundaries.", "တိုင်း/ပြည်နယ် ကိုယ်စားပြု အမှတ် သတ်မှတ်ရန် မြေပုံပေါ်တွင် တိုင်း/ပြည်နယ် တစ်ခု ရွေးပါ။ ထို့နောက် မြို့နယ် နယ်နိမိတ်များ ပေါ်လာပါမည်။")}
                </p>
              </section>
            </section>

            <aside className="data-column" aria-label="Data selection and details">
              <div className="selection-panel panel">
                <div className="panel-title-row selection-title"><div><p className="eyebrow">{tr("Build your view", "သင့်မြင်ကွင်း တည်ဆောက်ရန်")}</p><h2>{tr("Data workspace", "ဒေတာ လုပ်ငန်းခွင်")}</h2></div><span className="live-tag"><span className="status-dot" /> {chartState === "ready" ? tr("Observations loaded", "လေ့လာတွေ့ရှိချက် ရရှိပြီး") : selectedDataset?.available ? tr("Data source available", "ဒေတာ ရင်းမြစ် ရရှိနိုင်သည်") : tr("No data available", "ဒေတာ မရရှိနိုင်ပါ")}</span></div>
                <div className="selection-grid">
                  <div className="field-control">
                    <label htmlFor="township-select">{tr("Select Township", "မြို့နယ် ရွေးရန်")}</label>
                    <select id="township-select" value={townshipId} disabled={!regionId || !catalog?.townships.length} onChange={event=>{setTownshipId(event.target.value);setMapFocused(true);}} aria-describedby="township-help"><option value="">{tr("All townships in this region", "ဤတိုင်း/ပြည်နယ်ရှိ မြို့နယ်အားလုံး")}</option>{catalog?.townships.filter(item=>item.regionId===regionId).map(item=><option key={item.id} value={item.id}>{lang==="my"?item.nameMy:item.name}</option>)}</select>
                    <p className="field-hint" id="township-help">{tr("Selecting a township reloads the data for a point or boundary inside it. Nearby townships may share the same NASA grid cell.", "မြို့နယ်ရွေးလျှင် ၎င်းအတွင်းရှိ အမှတ် သို့မဟုတ် နယ်နိမိတ်အတွက် ဒေတာ ပြန်ရယူမည်။ အနီးရှိ မြို့နယ်များသည် NASA ဂရစ်ကွက် တစ်ခုတည်းကို မျှဝေနိုင်သည်။")}</p>
                  </div>
                  <div className="field-control">
                    <label htmlFor="regional-reference">{tr("Regional reference point", "တိုင်း/ပြည်နယ် ကိုယ်စားပြု အမှတ်")} <span className="field-meta">{tr("(not a township)", "(မြို့နယ် မဟုတ်ပါ)")}</span></label>
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
                      placeholder={tr("Search a state or region", "တိုင်း/ပြည်နယ် ရှာရန်")}
                      aria-describedby="region-help"
                    />
                    <datalist id="region-options">{REGIONS.flatMap((region) => [
                      <option key={`${region.id}-en`} value={`${region.name} — ${region.type}`} />,
                      <option key={`${region.id}-my`} value={`${region.nameMy} — ${region.type}`} />,
                    ])}</datalist>
                    <p className="field-hint" id="region-help">{tr("15 regional reference locations. Each result states its spatial basis.", "တိုင်း/ပြည်နယ် ကိုယ်စားပြု နေရာ ၁၅ ခု။ ရလဒ်တစ်ခုစီတွင် နေရာဆိုင်ရာ အခြေခံကို ဖော်ပြထားသည်။")}</p>
                  </div>
                  <div className="field-control">
                    <label htmlFor="dataset-select">{tr("Select data", "ဒေတာ ရွေးရန်")}</label>
                    <select id="dataset-select" value={datasetId} onChange={(event) => chooseDataset(event.target.value)} disabled={!datasets.length}>
                      <option value="">{tr("Choose a dataset", "ဒေတာအစု ရွေးပါ")}</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id}>
                          {datasetName(dataset.id, dataset.label)} ({dataset.unit}){dataset.available ? "" : ` — ${dataset.setupRequired ? T.finishSetup : T.accessNeeded}`}
                        </option>
                      ))}
                    </select>
                    {selectedDataset && !selectedDataset.available && <p className="field-hint">{selectedDataset.reason}</p>}
                    {selectedDataset?.coverage && <p className="field-hint">{tr("Published archive", "ထုတ်ပြန်ထားသော မှတ်တမ်း")}: {selectedDataset.coverage.start} {tr("to", "မှ")} {selectedDataset.coverage.ongoing ? tr(`the latest NASA release (${selectedDataset.coverage.end} or later)`, `NASA နောက်ဆုံးထုတ်ပြန်မှု (${selectedDataset.coverage.end} သို့မဟုတ် နောက်ပိုင်း) အထိ`) : selectedDataset.coverage.end}. {selectedDataset.temporalResolution}.</p>}
                    {!datasets.length && <p className="field-hint">{tr("No datasets are listed for this topic.", "ဤခေါင်းစဉ်အတွက် ဒေတာအစု မရှိပါ။")}</p>}
                  </div>
                  <div className="field-control">
                    <label>{tr("Date range", "ရက်စွဲ အပိုင်းအခြား")} <span className="field-meta">(UTC)</span></label>
                    <div className="date-range">
                      <div><label className="sr-only" htmlFor="start-date">Start date</label><input id="start-date" type="date" min="1981-01-01" max={questionDate(0)} value={draftStart} onChange={(event) => setDraftStart(event.target.value)} /></div>
                      <span aria-hidden="true">{tr("to", "မှ")}</span>
                      <div><label className="sr-only" htmlFor="end-date">End date</label><input id="end-date" type="date" min="1981-01-01" max={questionDate(0)} value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} /></div>
                    </div>
                    <div className="date-actions"><button type="button" className="button-primary" disabled={Boolean(dateError)} onClick={()=>{if(!dateError){setStart(draftStart);setEnd(draftEnd);setReloadToken(token=>token+1);}}}>{tr("Apply dates", "ရက်စွဲ အသုံးပြုရန်")}</button>{datasetId !== "fire-detections" && <button type="button" className="text-button" onClick={()=>{setDraftStart("1989-01-01");setDraftEnd(questionDate(0));}}>1989–today</button>}</div>
                    {dateError ? <p className="field-error" role="status">{dateError}</p> : <p className="field-hint">{tr("Apply your dates to update the graph. Recent days may not have published observations yet.", "ဂရပ်ကို ပြောင်းရန် ရက်စွဲများ အသုံးပြုပါ။ မကြာသေးမီ ရက်များအတွက် ဒေတာ မထုတ်ပြန်ရသေးနိုင်ပါ။")}</p>}
                    {datasetId === "fire-detections" && <p className="field-hint">NASA FIRMS supports up to 10 recent days ending today.</p>}
                  </div>
                </div>
                {catalogError && <div className="inline-notice notice-error" role="alert">{catalogError}</div>}
              </div>

              <section className="chart-card panel" aria-labelledby="chart-title">
                <div className="panel-title-row chart-heading">
                  <div><p className="eyebrow">{tr("Observation series", "လေ့လာတွေ့ရှိချက် အစဉ်")}</p><h2 id="chart-title">{selectedDataset ? datasetName(selectedDataset.id, selectedDataset.label) : tr("Dataset chart", "ဒေတာ ဂရပ်")}</h2><p>{(lang === "my" ? selectedTownship?.nameMy ?? selectedRegion?.nameMy : selectedTownship?.name ?? selectedRegion?.name) ?? tr("Select a location", "နေရာ ရွေးပါ")} · {start} — {end}</p></div>
                  <ChartNoAxesCombined className="chart-heading-icon" size={21} />
                </div>
                <DataChart state={chartState} result={result} error={chartError} onRetry={() => setReloadToken((token) => token + 1)} lang={lang} />
                {result && result.summary.count > 0 && (
                  <div className="chart-stats">
                    <div><span>{T.mean}</span><strong>{formatValue(result.summary.mean)} <small>{result.dataset.unit}</small></strong></div>
                    <div><span>{T.minimum}</span><strong>{formatValue(result.summary.min)} <small>{result.dataset.unit}</small></strong></div>
                    <div><span>{T.maximum}</span><strong>{formatValue(result.summary.max)} <small>{result.dataset.unit}</small></strong></div>
                    <div><span>{T.observations}</span><strong>{result.summary.count}<small> / {result.observations.length}</small></strong></div>
                  </div>
                )}
              </section>

              <section className="detail-card panel" aria-labelledby="detail-title">
                <div className="panel-title-row"><div><p className="eyebrow">{T.sources}</p><h2 id="detail-title">{T.detailed}</h2></div><ExternalLink size={17} /></div>
                {detailIndicator ? (
                  <div className="indicator-detail">
                    <div className="indicator-detail-head">
                      <h3>{indicatorName(detailIndicator)}</h3>
                      <button type="button" className="text-button" onClick={() => setDetailIndicator(null)}>{T.backToDetails}</button>
                    </div>
                    <p>{indicatorSummary(detailIndicator)}</p>
                    {(() => {
                      const dataset = catalog?.datasets.find((item) => item.id === detailIndicator.datasetId);
                      if (!dataset) return <p className="field-hint">No dataset is catalogued for this indicator, so no observations can be shown.</p>;
                      return (
                        <dl className="detail-grid">
                          <div><dt>{T.dataset}</dt><dd>{datasetName(dataset.id, dataset.label)}</dd></div>
                          <div><dt>{T.unit}</dt><dd>{dataset.unit}</dd></div>
                          <div><dt>{T.status}</dt><dd>{dataset.available ? T.connected : dataset.reason ?? "Not connected"}</dd></div>
                          <div><dt>{T.source}</dt><dd>{dataset.source.url
                            ? <a href={dataset.source.url} target="_blank" rel="noreferrer">{dataset.source.name}<ExternalLink size={11} /></a>
                            : dataset.source.name}</dd></div>
                          <div className="detail-full"><dt>{T.measures}</dt><dd>{dataset.description}</dd></div>
                          {lang === "my" && LIMITATION_MY[dataset.id] && <div className="detail-full"><dt>{T.limitations}</dt><dd>{LIMITATION_MY[dataset.id]}</dd></div>}
                          <div className="detail-full"><dt>{lang === "my" ? T.limitationsEnglish : T.limitations}</dt><dd>{dataset.limitations}</dd></div>
                        </dl>
                      );
                    })()}
                  </div>
                ) : result ? (
                  <dl className="detail-grid">
                    {result.dataWarning && <div className="detail-full detail-warning" role="note"><dt>{T.warning}</dt><dd>{result.dataWarning}</dd></div>}
                    <div className="detail-full"><dt>{T.spatialBasis}</dt><dd>{result.spatialBasis ? (lang === "my" ? spatialBasisMy(result.spatialBasis.label) : result.spatialBasis.label) : `${result.location?.type === "township" ? "Township Representative Point" : "Regional Reference Point"} (${(result.location ?? result.region).lat.toFixed(4)}°N, ${(result.location ?? result.region).lon.toFixed(4)}°E)`}</dd></div>
                    <div><dt>{T.selectedPlace}</dt><dd>{lang === "my" ? result.location?.nameMy ?? result.region.nameMy : result.location?.name ?? result.region.name}{result.location?.type === "township" ? ` (${lang === "my" ? result.region.nameMy : result.region.name})` : ""}</dd></div>
                    <div><dt>{T.topic}</dt><dd>{activeTopicData ? topicName(activeTopicData.id, activeTopicData.label) : ""}</dd></div>
                    <div><dt>{T.dataset}</dt><dd>{datasetName(result.dataset.id, result.dataset.label)}</dd></div>
                    <div><dt>{T.period}</dt><dd>{result.period.start} — {result.period.end}</dd></div>
                    <div><dt>{T.unitsSource}</dt><dd>{result.dataset.unit} · <a href={result.source.url} target="_blank" rel="noreferrer">{result.source.name}<ExternalLink size={11} /></a></dd></div>
                    <div><dt>{T.latest}</dt><dd>{formatValue(result.summary.latest)} {result.dataset.unit}</dd></div>
                    <div><dt>{T.coverage}</dt><dd>{result.geographicCoverage}</dd></div>
                    <div><dt>{T.received}</dt><dd>{new Date(result.observedAt).toLocaleString()}</dd></div>
                    {result.missingCount > 0 && <div><dt>{T.missing}</dt><dd>{T.missingValue(result.missingCount)}</dd></div>}
                    <div className="detail-full"><dt>{T.reading}</dt><dd>{lang === "my" ? "" : `${result.dataset.description}. `}{T.readPrefix} {result.spatialBasis?.kind?.startsWith("area") ? T.readArea : result.spatialBasis?.kind === "river-reach" ? T.readReach : result.spatialBasis?.kind === "grid-cell" ? T.readCell : T.readPoint}</dd></div>
                    {lang === "my" && LIMITATION_MY[result.dataset.id] && <div className="detail-full"><dt>{T.limitations}</dt><dd>{LIMITATION_MY[result.dataset.id]}</dd></div>}
                    <div className="detail-full"><dt>{lang === "my" ? T.limitationsEnglish : T.limitations}</dt><dd>{result.dataset.limitations}</dd></div>
                  </dl>
                ) : (
                  <div className="detail-placeholder">{chartState === "loading" ? tr("Source and coverage details will appear with the observations.", "ရင်းမြစ်နှင့် နယ်ပယ် အသေးစိတ်များ လေ့လာတွေ့ရှိချက်နှင့်အတူ ပေါ်လာပါမည်။") : tr("Select a connected dataset and a location to see source metadata, observation period and limitations.", "ရင်းမြစ်၊ လေ့လာသည့်ကာလနှင့် ကန့်သတ်ချက်များ ကြည့်ရန် ဒေတာအစုနှင့် နေရာ ရွေးပါ။")}</div>
                )}
              </section>

              <div className="coverage-card">
                <div className="coverage-heading"><MapPin size={16} /><strong>{tr("Coverage note", "နယ်ပယ် မှတ်ချက်")}</strong></div>
                <p>{catalog?.townshipCoverage.reason ?? "Township boundaries support selection. NASA POWER uses the selected township or regional representative point."}</p>
                <span>{tr("Township boundaries: available · Each result states whether it is a point, a pixel window, a river reach or a whole-area value", "မြို့နယ် နယ်နိမိတ်များ ရရှိနိုင်သည် · ရလဒ်တစ်ခုစီတွင် နေရာဆိုင်ရာ အခြေခံကို ဖော်ပြထားသည်")}</span>
              </div>
            </aside>
          </div>
          <footer className="site-footer"><span>{tr("Data: NASA POWER · NASA MODIS (ORNL DAAC) · NASA SWOT · NASA PACE · NASA Black Marble · NASA FIRMS · Boundaries: MIMU, Natural Earth", "ဒေတာ - NASA POWER · NASA MODIS (ORNL DAAC) · NASA SWOT · NASA PACE · NASA Black Marble · NASA FIRMS · နယ်နိမိတ် - MIMU, Natural Earth")}</span><a href="/earthlens.html">Original dashboard preview <ExternalLink size={13} /></a></footer>
        </div>
      )}
      {view === "explore" && <><button className="floating-ai-launcher button-primary" aria-expanded={chatOpen} aria-controls="floating-ai-panel" onClick={()=>setChatOpen(open=>!open)}><MessageCircle size={18}/> AI chat</button>{chatOpen && <section id="floating-ai-panel" className="floating-ai-panel" role="dialog" aria-label="EarthLens AI chat" onKeyDown={event=>{if(event.key==="Escape")setChatOpen(false);}}><button className="floating-ai-close button-secondary" onClick={()=>setChatOpen(false)} autoFocus>Close chat</button><ChatPanel lang={lang} selectedRegionId={regionId} inputRef={chatInputRef}/></section>}</>}
    </main>
  );
}
