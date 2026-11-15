"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChartNoAxesCombined, LoaderCircle, MessageCircle, Radio, TriangleAlert } from "lucide-react";
import { selectionError } from "@/features/explorer/workspace-selection";
import { WorkspaceDetails } from "@/features/explorer/components/WorkspaceDetails";
import { DataWorkspace } from "@/features/explorer/components/DataWorkspace";
import { indicatorDescription, workspaceError } from "@/features/explorer/workspace-copy";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { EarthbeatExperience } from "@/features/explorer/components/EarthbeatExperience";
import { ChatPanel } from "@/features/explorer/components/ChatPanel";
import { fetchExploreCatalog, fetchObservations, type ExploreCatalog, type ObservationResponse } from "@/features/explorer/client/data-service";
import { type TopicId, type TopicIndicator } from "@/features/explorer/catalog";

import { selectionKey, responseMatchesSelection, type ObservationSelection } from "@/features/explorer/client/data-service";
import { saveSearch, type HistoryCard } from "@/features/explorer/history/store";
import { useSearchHistory } from "@/features/explorer/history/useSearchHistory";
import { HistoryCards } from "@/features/explorer/history/HistoryCards";
import { ReferenceHome } from "./reference-home";
import { SettingsMenu } from "./settings-menu";

type View = "home" | "explore" | "history" | "saved";
type Lang = "en" | "my";
type ChartState = "initial" | "loading" | "ready" | "empty" | "unavailable" | "error";

const questionDate = (daysAgo: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

function DataChart({ state, result, error, onRetry, lang = "en" }: { state: ChartState; result: ObservationResponse | null; error: string; onRetry: () => void; lang?: Lang }) {
  const t = (en: string, my: string) => lang === "my" ? my : en;
  if (state === "loading") {
    return <div className="chart-state" role="status"><LoaderCircle className="spin" size={24} /> {t("Retrieving NASA observations…", "NASA မှ အချက်အလက်များကို ရယူနေသည်…")}</div>;
  }
  if (state === "initial") {
    return <div className="chart-state"><ChartNoAxesCombined size={25} /> {t("Choose an indicator, location and date range, then apply your selection.", "ညွှန်ကိန်း၊ တည်နေရာနှင့် ရက်စွဲကာလကို ရွေးပြီး အချက်အလက်များကို ကြည့်ရန် နှိပ်ပါ။")}</div>;
  }
  if (state === "unavailable") {
    return <div className="chart-state chart-unavailable"><Radio size={24} /> {workspaceError(error || "No observation data is available for this selection.", lang)}</div>;
  }
  if (state === "error") {
    return <div className="chart-state chart-error" role="alert"><TriangleAlert size={24} /><span>{workspaceError(error || "Could not retrieve observations.", lang)}<button className="text-button" onClick={onRetry}>{t("Try again", "ပြန်စမ်းရန်")}</button></span></div>;
  }
  if (state === "empty" || !result) {
    return <div className="chart-state">{t("No observations are available for this selection and period. Missing values are left blank, not treated as zero.", "ရွေးထားသော တည်နေရာနှင့် ကာလအတွက် အချက်အလက် မရှိပါ။ ပျောက်နေသော တန်ဖိုးများကို သုညအဖြစ် မသတ်မှတ်ပါ။")}</div>;
  }
  return (
    <div className="chart-plot">
      {result.summary.count === 0 ? (
        <div className="chart-state">{t("NASA returned no valid observations for this period. Missing values are not plotted as zero.", "ဤကာလအတွက် NASA မှ မှန်ကန်သော တိုင်းတာချက် မရရှိပါ။ မရှိသောတန်ဖိုးများကို သုညအဖြစ် မပြပါ။")}</div>
      ) : <EarthbeatExperience lang={lang} key={`${result.location?.id ?? result.region.id}:${result.dataset.id}:${result.period.start}:${result.period.end}`} result={result} />}
      <div className="chart-legend"><span className="legend-line" />{indicatorDescription(result.dataset.id, result.dataset.description, lang)}<span className="legend-unit">{result.dataset.unit}</span></div>
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
  const [catalog, setCatalog] = useState<ExploreCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [activeTopic, setActiveTopic] = useState<TopicId>("agriculture");
  const [openTopic, setOpenTopic] = useState<TopicId | null>(null);
  const [datasetId, setDatasetId] = useState("");
  const [draftStart,setDraftStart] = useState("");
  const [draftEnd,setDraftEnd] = useState("");
  const [chartState, setChartState] = useState<ChartState>("initial");
  const [receivedResult, setResult] = useState<ObservationResponse | null>(null);
  const [resultKey, setResultKey] = useState("");
  const [locationMode, setLocationMode] = useState<"township" | "reference">("reference");
  const [appliedSelection, setAppliedSelection] = useState<ObservationSelection | null>(null);
  const history = useSearchHistory();
  const [savedSearch, setSavedSearch] = useState<{ card: HistoryCard; result: ObservationResponse } | null>(null);
  const [chartError, setChartError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [focusChatOnHome, setFocusChatOnHome] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const selection: ObservationSelection = { topicId: activeTopic, regionId, datasetId, start: draftStart, end: draftEnd, townshipId: townshipId || undefined };
  const currentSelectionKey = selectionKey(selection);
  const dirty = !appliedSelection || selectionKey(appliedSelection) !== currentSelectionKey
    || locationMode !== (appliedSelection.townshipId ? "township" : "reference");
  // A changed location must never render the previous graph, even before the next effect runs.
  const result = !dirty && resultKey === currentSelectionKey ? receivedResult : null;

  useEffect(() => {
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent("earthlens-language-change", { detail: lang }));
  }, [lang]);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("earthlens-language");
      if (savedLanguage === "en" || savedLanguage === "my") setLang(savedLanguage);
    } catch { /* The language can still be selected for this visit. */ }
    function syncLanguage(event: StorageEvent) {
      if (event.key !== "earthlens-language" && event.key !== null) return;
      const savedLanguage = event.newValue === "my" ? "my" : "en";
      setLang(savedLanguage);
    }
    window.addEventListener("storage", syncLanguage);
    return () => window.removeEventListener("storage", syncLanguage);
  }, []);

  function selectLanguage(language: Lang) {
    setLang(language);
    try { localStorage.setItem("earthlens-language", language); } catch { /* The language still changes for this visit. */ }
  }

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
        setDraftStart(period.start); setDraftEnd(period.end);
      }
    }
  }, [activeTopic, catalog, datasetId, datasets]);

  useEffect(() => {
    const controller = new AbortController();
    if (view !== "explore" || !appliedSelection || dirty) {
      setResult(null);
      setChartState("initial");
      return () => controller.abort();
    }
    const requestSelection = appliedSelection;
    const requestKey = selectionKey(requestSelection);
    setChartState("loading");
    setChartError("");
    setResult(null);
    fetchObservations(requestSelection, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (!responseMatchesSelection(data, requestSelection)) throw new Error("The data source returned a different location or period. Please try this search again.");
      setResultKey(requestKey);
      setResult(data);
      setChartState(data.summary.count === 0 ? "empty" : "ready");
      if (data.summary.count > 0) void saveSearch(requestSelection, data).catch(cause => history.setError(cause instanceof Error ? cause.message : "This search could not be saved on this device."));
    }).catch(cause => {
      if (controller.signal.aborted) return;
      setResult(null);
      setChartError(cause instanceof Error ? cause.message : "Could not retrieve observations.");
      setChartState("error");
    });
    return () => controller.abort();
  }, [appliedSelection, currentSelectionKey, dirty, reloadToken, view]);

  function applySelection() {
    const validation = selectionError(selection, selectedDataset, locationMode);
    if (validation) { setChartError(validation); return; }
    setAppliedSelection({ ...selection });
    setReloadToken(token => token + 1);
  }

  function chooseTopic(topicId: TopicId) {
    // Pressing the open category again collapses it.
    if (openTopic === topicId) {
      setOpenTopic(null);
      return;
    }
    setOpenTopic(topicId);
    if (topicId === activeTopic && datasetId) return;
    setActiveTopic(topicId);
    const choices = catalog?.datasets.filter(dataset => dataset.topicId === topicId) ?? [];
    const first = choices.find(dataset => dataset.available && dataset.parameter) ?? choices.find(dataset => dataset.available);
    chooseDataset(first?.id ?? "");
    setResult(null);
  }

  function chooseIndicator(indicator: TopicIndicator) {
    const definition = catalog?.datasets.find(dataset => dataset.id === indicator.datasetId);
    if (definition) {setActiveTopic(definition.topicId); setOpenTopic(definition.topicId);}
    chooseDataset(indicator.datasetId || `unconnected:${indicator.label}`);
  }

  function chooseDataset(nextId: string) {
    const definition = catalog?.datasets.find(dataset => dataset.id === nextId);
    if (definition) { setActiveTopic(definition.topicId); setOpenTopic(definition.topicId); }
    setDatasetId(nextId);
    const period = catalog?.datasets.find(dataset => dataset.id === nextId)?.defaultPeriod;
    if (period) {
      setDraftStart(period.start); setDraftEnd(period.end);
    }
    if (nextId === "fire-detections") {
      setDraftStart(questionDate(6));
      setDraftEnd(questionDate(0));
    }
  }

  function chooseRegion(nextRegionId: string) {
    const region = REGIONS.find((item) => item.id === nextRegionId);
    setTownshipId("");
    if (!region) {
      setRegionId("");
      setMapFocused(false);
      return;
    }
    if (region.id === regionId) {
      setRegionId("");
      setMapFocused(false);
      return;
    }
    setMapFocused(true);
    setRegionId(region.id);
  }

  function chooseTownship(nextTownshipId: string) {
    // Clicking the selected township again steps back out to its state or region.
    if (nextTownshipId && nextTownshipId === townshipId) {
      setTownshipId("");
      return;
    }
    setTownshipId(nextTownshipId);
    if (nextTownshipId) setLocationMode("township");
    setMapFocused(true);
  }

  async function openSaved(id: string) {
    const saved = await history.load(id);
    setChatOpen(false);
    if (saved) { setSavedSearch(saved); setView("saved"); }
    else setView("history");
  }
  function historyAction(action: string, id?: string) {
    if (action === "history-all") { setChatOpen(false); setView("history"); }
    else if (id && action === "history-open") void openSaved(id);
    else if (id && action === "history-download") void history.download(id);
    else if (id && action === "history-delete") void history.remove(id);
  }
  function exploreSaved() {
    if (!savedSearch) return;
    const saved = savedSearch.card.selection;
    setActiveTopic(saved.topicId); setOpenTopic(saved.topicId); setDatasetId(saved.datasetId);
    setRegionId(saved.regionId); setTownshipId(saved.townshipId || "");
    setMapFocused(true); setDraftStart(saved.start); setDraftEnd(saved.end);
    setLocationMode(saved.townshipId ? "township" : "reference");
    setAppliedSelection({ ...saved });
    setReloadToken(token => token + 1); setView("explore");
  }

  function askAI() {
    if (view === "explore") {setChatOpen(true);return;}
    setFocusChatOnHome(true);
    setView("home");
  }

  const t = (en: string, my: string) => lang === "my" ? my : en;

  if (view === "home") return (
    <main className="earthlens-app" lang={lang}>
      <ReferenceHome historyPreview={{ cards: history.cards, loading: history.loading, error: history.error, busyId: history.busyId }} onHistory={historyAction} lang={lang} onExplore={(topic) => { if (topic) setActiveTopic(topic); setView("explore"); }} onAsk={() => setChatOpen(true)} onRegion={(id) => { chooseRegion(id); setView("explore"); }} onLanguage={selectLanguage} />
      <button className="floating-ai-launcher button-primary" aria-expanded={chatOpen} aria-controls="floating-ai-panel" onClick={() => setChatOpen(open => !open)}><MessageCircle size={18} /> {lang === "my" ? "AI စကားပြော" : "AI chat"}</button>
      {chatOpen && <section id="floating-ai-panel" className="floating-ai-panel" role="dialog" aria-label="EarthLens AI chat" onKeyDown={event => { if (event.key === "Escape") setChatOpen(false); }}><button className="floating-ai-close button-secondary" onClick={() => setChatOpen(false)}>{lang === "my" ? "ပိတ်ရန်" : "Close chat"}</button><ChatPanel lang={lang} selectedRegionId={regionId} inputRef={chatInputRef} /></section>}
    </main>
  );

  if (view === "history" || view === "saved") return (
    <main className="earthlens-app" lang={lang}>
      <header className="site-header"><a className="brand-lockup" href="#home" onClick={event => { event.preventDefault(); setView("home"); }}><img className="earthlens-brand-art" src="/brand/chainsa-icon.png" alt="" /><span className="brand-text"><strong className="chainsa-wordmark" aria-label="ChainSa">Ch<span className="brand-letter-yellow">a</span><span className="brand-letter-blue">i</span>nSa</strong><small>MYANMAR EARTH INTELLIGENCE</small></span></a><SettingsMenu lang={lang} onLanguage={selectLanguage} /></header>
      <div className="history-page">
        <button className="button-secondary" onClick={() => setView(view === "saved" ? "history" : "home")}><ArrowLeft size={16} />{lang === "my" ? "နောက်သို့" : "Back"}</button>
        <h1>{view === "saved" ? (lang === "my" ? "သိမ်းထားသော ရှာဖွေမှု" : "Saved discovery") : (lang === "my" ? "ရှာဖွေမှုမှတ်တမ်း" : "Search history")}</h1>
        <p className="history-device-note">{lang === "my" ? "ဤစက်ပေါ်တွင်သာ သိမ်းထားသည်။ ဘရောက်ဇာအချက်အလက်များကို ရှင်းပါက မှတ်တမ်းများ ပျောက်ပါမည်။ မိတ္တူအဖြစ် PDF ဒေါင်းလုဒ်လုပ်ထားပါ။" : "Saved on this device. Clearing browser data removes this history. Download PDFs to keep a copy."}</p>
        {view === "saved" && savedSearch ? <>
          <div className="history-snapshot-header"><div><h2>{lang === "my" ? savedSearch.card.locationMy : savedSearch.card.location}</h2><p>{lang === "my" ? "သိမ်းထားသည့်ရက်" : "Saved"}: {new Date(savedSearch.card.savedAt).toLocaleString()} · {lang === "my" ? "သိမ်းထားသော အချက်အလက်" : "Saved snapshot"}</p></div><div className="history-actions"><button className="button-primary" disabled={!!history.busyId} onClick={() => void history.download(savedSearch.card.id)}>{history.busyId ? "Preparing…" : "Download PDF"}</button><button className="button-secondary" onClick={exploreSaved}>{lang === "my" ? "အချက်အလက်အသစ် ပြန်ရှာရန်" : "Explore current data"}</button></div></div>
          {history.error && <p className="history-notice" role="alert">{history.error}</p>}
          <DataChart lang={lang} state="ready" result={savedSearch.result} error="" onRetry={exploreSaved} />
        </> : <HistoryCards cards={history.cards} loading={history.loading} error={history.error} busyId={history.busyId} lang={lang} onOpen={id => void openSaved(id)} onDownload={id => void history.download(id)} onDelete={id => void history.remove(id)} onClear={() => void history.clear()} />}
      </div>
    </main>
  );

  return (
    <main className={`earthlens-app${view === "explore" ? " is-exploring workspace-redesign" : ""}`} lang={lang}>
      <header className="site-header">
        <a className="brand-lockup" href="#home" onClick={(event) => { event.preventDefault(); setView("home"); }} aria-label="Myanmar EarthLens home">
          <img className="earthlens-brand-art" src="/brand/chainsa-icon.png" alt="" />
          <span className="brand-text"><strong className="chainsa-wordmark" aria-label="ChainSa">Ch<span className="brand-letter-yellow">a</span><span className="brand-letter-blue">i</span>nSa</strong><small>MYANMAR EARTH INTELLIGENCE</small></span>
        </a>
        <SettingsMenu lang={lang} onLanguage={selectLanguage} />
      </header>

      <nav className="workspace-top-navigation" aria-label={t("Page navigation", "စာမျက်နှာ လမ်းညွှန်")} >
      <button type="button" className="workspace-home-link button-secondary" onClick={() => {setChatOpen(false);setView("home");}}><ArrowLeft size={16} />{t("Home", "ပင်မစာမျက်နှာ")}</button>
      </nav>

      <DataWorkspace
        lang={lang} catalog={catalog} catalogError={catalogError} activeTopic={activeTopic} openTopic={openTopic}
        datasetId={datasetId} regionId={regionId} townshipId={townshipId} locationMode={locationMode}
        start={draftStart} end={draftEnd} mapFocused={mapFocused} dirty={dirty}
        loading={chartState === "loading" && !dirty} error={chartError} result={result}
        onTopic={chooseTopic} onIndicator={chooseIndicator} onDataset={chooseDataset} onRegion={chooseRegion} onTownship={chooseTownship}
        onLocationMode={mode => {setLocationMode(mode); setTownshipId("");}}
        onStart={setDraftStart} onEnd={setDraftEnd} onApply={applySelection} onMapFocus={setMapFocused}
        chart={<DataChart lang={lang} state={dirty ? "initial" : chartState} result={result} error={chartError} onRetry={applySelection} />}
        details={<WorkspaceDetails lang={lang} result={result} dataset={selectedDataset} />}
      />
      {view === "explore" && <><button className="floating-ai-launcher button-primary" aria-expanded={chatOpen} aria-controls="floating-ai-panel" onClick={()=>setChatOpen(open=>!open)}><MessageCircle size={18}/>{t("AI chat", "AI စကားပြော")}</button>{chatOpen && <section id="floating-ai-panel" className="floating-ai-panel" role="dialog" aria-label="EarthLens AI chat" onKeyDown={event=>{if(event.key==="Escape")setChatOpen(false);}}><button className="floating-ai-close button-secondary" onClick={()=>setChatOpen(false)} autoFocus>{lang === "my" ? "ပိတ်ရန်" : "Close chat"}</button><ChatPanel lang={lang} selectedRegionId={regionId} inputRef={chatInputRef}/></section>}</>}
    </main>
  );
}
