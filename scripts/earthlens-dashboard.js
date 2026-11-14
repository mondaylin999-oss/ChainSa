// Runs inside the reference bundle, preserving its map, charts, translations and API models.
function Og() {
  const h = ft.createElement;
  const [lang, setLang] = ft.useState("en");
  const [topic, setTopic] = ft.useState("agriculture");
  const [regionId, setRegionId] = ft.useState("");
  const [townships, setTownships] = ft.useState([]);
  const [townshipId, setTownshipId] = ft.useState("");
  const [townshipSearch, setTownshipSearch] = ft.useState("");
  const [townshipError, setTownshipError] = ft.useState(false);
  ft.useEffect(() => {
    fetch("/townships.json").then(response => {
      if (!response.ok) throw new Error("Townships unavailable");
      return response.json();
    }).then(data => setTownships(data.townships)).catch(() => setTownshipError(true));
  }, []);
  const [param, setParam] = ft.useState("rainfall");
  const mode = "live";
  const [boundaries, setBoundaries] = ft.useState(null);
  const [townshipBoundaries, setTownshipBoundaries] = ft.useState(null);
  const [boundaryError, setBoundaryError] = ft.useState(false);
  const [result, setResult] = ft.useState(null);
  const [busy, setBusy] = ft.useState(false);
  const [error, setError] = ft.useState("");
  const [latest, setLatest] = ft.useState(true);
  const [range, setRange] = ft.useState({ start: "", end: "" });
  const [refresh, setRefresh] = ft.useState(0);
  const [collapsed, setCollapsed] = ft.useState(false);
  const [mobileView, setMobileView] = ft.useState("map");
  const [chatOpen, setChatOpen] = ft.useState(false);
  const [narrow, setNarrow] = ft.useState(() => window.matchMedia("(max-width: 700px)").matches);
  ft.useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const t = key => yw[lang][key] || key;
  const text = (en, my) => lang === "my" ? my : en;
  const region = Tr.find(item => item.id === regionId);
  const township = townships.find(item => item.id === townshipId);
  const name = item => lang === "my" ? item.nameMy : item.name;
  const context = ft.useMemo(() => ({lang, t, setLang}), [lang]);
  const options = dh[topic];
  const selectedResult = result?.results.find(item => item.param === param);
  const label = key => lang === "my" ? Ha[key].labelMy : Ha[key].label;
  const icon = (component, size = 18) => h(component, {width: size, height: size, "aria-hidden": true});
  ft.useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  ft.useEffect(() => {
    try { localStorage.removeItem("earthlens-mode"); } catch {}
  }, []);
  ft.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/regions", {signal: controller.signal}),
      fetch("/township-boundaries.geojson", {signal: controller.signal})
    ]).then(async ([regionResponse, townshipResponse]) => {
      if (!regionResponse.ok || !townshipResponse.ok) throw new Error("Boundaries unavailable");
      const [regionData, townshipData] = await Promise.all([regionResponse.json(), townshipResponse.json()]);
      setBoundaries(regionData.boundaries);
      setTownshipBoundaries(townshipData);
    }).catch(err => {
      if (err.name !== "AbortError") setBoundaryError(true);
    });
    return () => controller.abort();
  }, []);
  ft.useEffect(() => {
    setResult(null);
    setError("");
    setBusy(false);
    if (!regionId || (!latest && (!range.start || !range.end))) return;
    const controller = new AbortController();
    setBusy(true);
    fetch("/api/analyze", {
      method: "POST", signal: controller.signal,
      headers: {"content-type": "application/json"},
      body: JSON.stringify({regionId, params: [param], mode, ...latest ? {} : {range}})
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not retrieve data.");
      if (!controller.signal.aborted) setResult(data);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [regionId, param, mode, latest, range.start, range.end, refresh]);
  function chooseTopic(key) {
    setTopic(key);
    if (!dh[key].includes(param)) setParam(dh[key].find(id => Ha[id].status !== "coming-soon"));
  }
  function selectRegion(id) { setRegionId(id); setTownshipId(""); setTownshipSearch(""); }
  function selectTownship(id) {
    const selected = townships.find(item => item.id === id);
    if (!selected) return;
    setRegionId(selected.regionId);
    setTownshipId(id);
    setTownshipSearch("");
  }
  function panelTitle(title, small) {
    return h("div", {className:"terra-panel-title"}, h("h2", null, title), small && h("span", null, small));
  }
  function notes(items) {
    return items.map((item, index) => h("div", {key:index, className:"terra-note"},
      h("strong", null, item.title), h("p", null, item.text)));
  }
  return h(L7.Provider, {value:context}, h("div", {className:`terra-app ${collapsed ? "terra-collapsed" : ""}`, "data-view":mobileView},
    h("header", {className:"terra-header"},
      h("div", {className:"terra-brand"},
        h("span", {className:"terra-mark"}, icon(mo, 24)),
        h("div", null, h("strong", null, "Myanmar EarthLens"), h("span", null, text("Environmental intelligence", "ပတ်ဝန်းကျင်ဆိုင်ရာ အချက်အလက်"))),
        h("span", {className:"terra-brand-divider", "aria-hidden":true}, "×"),
        h("a", {className:"terra-nasa", href:"https://power.larc.nasa.gov/", target:"_blank", rel:"noreferrer", "aria-label":"NASA POWER data source"}, "NASA", h("small", null, "EARTH DATA"))),
      h("div", {className:"terra-header-actions"},
        h("span", {className:"terra-live-status"}, h("span", {className:"terra-dot live", "aria-hidden":true}), t("modeLive")),
        h("button", {className:"terra-language", onClick:()=>setLang(lang === "en" ? "my" : "en")}, icon(pd, 15), lang === "en" ? "မြန်မာ" : "English"))),
    h("div", {className:"terra-workspace"},
      h("aside", {className:"terra-sidebar", "aria-label":text("Topics", "ကဏ္ဍများ")},
        h("div", {className:"terra-sidebar-heading"}, h("span", null, text("EXPLORE", "လေ့လာရန်")),
          h("button", {className:"terra-collapse", onClick:()=>setCollapsed(!collapsed), "aria-label":text("Toggle topic sidebar", "ကဏ္ဍများ ဖွင့်/ပိတ်"), "aria-expanded":!collapsed}, icon(id, 16))),
        h("nav", {className:"terra-topics"}, Object.keys(dh).map(key => h("button", {
          key, onClick:()=>chooseTopic(key), className:topic===key ? "active" : "", "aria-pressed":topic===key, title:t(key)
        }, icon(T9e[key], 21), h("span", null, t(key)), topic===key && h("span", {className:"terra-topic-indicator", "aria-hidden":true})))),
        h("div", {className:"terra-sidebar-foot"},
          icon(ds, 19), h("div", null, h("strong", null, "NASA POWER"), h("p", null, text("Observations, with sources.", "ရင်းမြစ်ပါသော လေ့လာတွေ့ရှိချက်များ။"))),
          h("details", {className:"terra-about"}, h("summary", null, t("about")),
            h("p", null, text("Daily NASA data for a representative point in each state or region. Historical observations are not a forecast.", "ပြည်နယ်နှင့် တိုင်းဒေသကြီးတစ်ခုစီ၏ ကိုယ်စားပြုနေရာအတွက် NASA နေ့စဉ်ဒေတာ။ သမိုင်းဝင်အချက်အလက်များသည် ခန့်မှန်းချက် မဟုတ်ပါ။")),
            h("a", {href:"https://worldview.earthdata.nasa.gov/", target:"_blank", rel:"noreferrer"}, "NASA Worldview ↗"),
            h("a", {href:"https://search.earthdata.nasa.gov/", target:"_blank", rel:"noreferrer"}, "Earthdata Search ↗")))),
      h("main", {className:"terra-main"},
        h("div", {className:"terra-page-heading"}, h("div", null,
          h("p", {className:"terra-eyebrow"}, text("MYANMAR / ENVIRONMENT", "မြန်မာ / ပတ်ဝန်းကျင်")),
          h("h1", null, t(topic))), h("span", {className:"terra-observation-label"}, icon(ld, 14), text("Historical observations", "သမိုင်းဝင် လေ့လာတွေ့ရှိချက်များ"))),
        h("div", {className:"terra-mobile-tabs", role:"group", "aria-label":text("Dashboard view", "မြင်ကွင်း")},
          ["map", "insights"].map(key => h("button", {key, "aria-pressed":mobileView===key, onClick:()=>setMobileView(key)}, text(key === "map" ? "Map" : "Graph & details", key === "map" ? "မြေပုံ" : "ဂရပ်နှင့် အသေးစိတ်")))),
        h("div", {className:"terra-content"},
          h("div", {className:"terra-center"},
            (!narrow || mobileView === "map") && h("section", {className:"terra-map-panel", "aria-label":t("navMap"), key:narrow ? "mobile-map" : "desktop-map"},
              h("div", {className:"terra-map-heading"}, h("div", null, icon(ol, 17), h("strong", null, township ? `${name(township)} · ${name(region)}` : region ? name(region) : text("Explore Myanmar", "မြန်မာနိုင်ငံကို လေ့လာရန်"))),
                h("span", null, region ? label(param) : text("Select a state or region", "ပြည်နယ် သို့မဟုတ် တိုင်းဒေသကြီး ရွေးရန်"))),
              h("div", {className:"terra-map-canvas", id:"map"},
                h(O9e, {regions:Tr, boundaries, selectedId:regionId, onSelect:selectRegion, fires:result?.fires, loading:busy,
                  townships, townshipBoundaries:regionId && townshipBoundaries ? {...townshipBoundaries, features:townshipBoundaries.features.filter(feature=>townships.some(item=>item.id===feature.properties.TS_PCODE && item.regionId===regionId))} : null, selectedTownshipId:townshipId, onSelectTownship:selectTownship})),
              boundaryError && h("p", {role:"alert", className:"terra-error"}, text("Map boundaries could not load. Use the location selector to continue.", "မြေပုံနယ်နိမိတ်များ မရရှိပါ။ နေရာရွေးချယ်မှုကို အသုံးပြုပါ။"))),
            null),
          h("aside", {className:"terra-inspector", "aria-label":text("Location and insights", "နေရာနှင့် သုံးသပ်ချက်များ")},
            h("section", {className:"terra-controls terra-panel"},
              panelTitle(text("Explore conditions", "အခြေအနေများကို လေ့လာရန်")),
              h("label", {className:"terra-field"}, h("span", null, t("selectRegion")),
                h("select", {value:regionId, onChange:event=>selectRegion(event.target.value)},
                  h("option", {value:""}, text("Choose a state or region", "ပြည်နယ် သို့မဟုတ် တိုင်းဒေသကြီး ရွေးရန်")),
                  Tr.map(item=>h("option", {key:item.id, value:item.id}, name(item))))),
              region && h("details", {className:"terra-disclosure terra-townships"},
                h("summary", null, text("Townships (optional)", "မြို့နယ်များ (ရွေးချယ်နိုင်သည်)"), townshipId && ` · ${name(townships.find(item=>item.id===townshipId))}`),
                h("fieldset", {className:"terra-field"},
                h("legend", null, text("Townships", "မြို့နယ်များ")),
                h("input", {type:"search", value:townshipSearch, placeholder:text("Search township or Pcode", "မြို့နယ် ရှာရန်"), "aria-label":text("Search townships", "မြို့နယ် ရှာရန်"), onChange:event=>setTownshipSearch(event.target.value)}),
                h("select", {value:townshipId, "aria-label":text("Township", "မြို့နယ်"), onChange:event=>setTownshipId(event.target.value)},
                  h("option", {value:""}, text("Choose a township", "မြို့နယ် ရွေးပါ")),
                  townships.filter(item=>item.regionId===regionId && (item.id===townshipId || `${item.name} ${item.nameMy} ${item.id}`.toLowerCase().includes(townshipSearch.toLowerCase()))).map(item=>h("option", {key:item.id,value:item.id}, `${name(item)} · ${item.id}`))),
                h("small", null, townshipError ? text("Township names could not load. Reload to try again.", "မြို့နယ်အမည်များ မရရှိပါ။ ပြန်ဖွင့်ပါ။") : text("MIMU PCode 9.4 boundaries. Measurements still use the selected state/region reference point.", "MIMU PCode 9.4 နယ်နိမိတ်များ။ ဒေတာသည် ရွေးထားသော တိုင်း/ပြည်နယ် ကိုယ်စားပြုနေရာအတွက် ဖြစ်သည်။")))),
              h("label", {className:"terra-field"}, h("span", null, t("chooseData")),
                h("select", {value:param, onChange:event=>setParam(event.target.value)}, options.map(key=>h("option", {key, value:key, disabled:Ha[key].status === "coming-soon"},
                  label(key) + (Ha[key].status === "coming-soon" ? ` · ${t("comingSoon")}` : ""))))),
              h("label", {className:"terra-field"}, h("span", null, t("dateRange")),
                h("select", {value:latest ? "latest" : "custom", onChange:event=>setLatest(event.target.value === "latest")},
                  h("option", {value:"latest"}, t("latest7")), h("option", {value:"custom"}, text("Custom dates", "ရက်စွဲရွေးရန်")))),
              !latest && h("div", {className:"terra-date-fields"}, ["start", "end"].map(key=>h("label", {className:"terra-field", key},
                h("span", null, t(key === "start" ? "from" : "to")), h("input", {type:"date", min:"1981-01-01", max:new Date().toISOString().slice(0,10), value:range[key], onChange:event=>setRange(previous=>({...previous, [key]:event.target.value}))})))),
              h("button", {className:"terra-analyze", onClick:()=>setRefresh(value=>value+1), disabled:busy || !regionId || (!latest && (!range.start || !range.end))},
                icon(busy ? go : _d, 16), t(busy ? "analyzing" : "analyze")),
              h("p", {className:"terra-scope-note"}, text("Township outlines are available on the map; measurements still use the state / region reference point.", "မြို့နယ်နယ်နိမိတ်များကို မြေပုံတွင် ကြည့်နိုင်ပါသည်။ တိုင်းတာချက်များသည် ပြည်နယ် / တိုင်းဒေသကြီး ကိုယ်စားပြုအမှတ်ကို ဆက်လက်အသုံးပြုပါသည်။"))),
            error && h("div", {className:"terra-error", role:"alert"}, error, h("button", {onClick:()=>setRefresh(value=>value+1)}, text("Try again", "ထပ်ကြိုးစားရန်"))),
            h("section", {className:"terra-panel terra-chart", "aria-busy":busy},
              panelTitle(text("Observation trend", "လေ့လာတွေ့ရှိချက် လမ်းကြောင်း"), Ha[param].unit),
              result && h("p", {className:"terra-period"}, `${result.period.start} → ${result.period.end}`),
              busy ? h("div", {className:"terra-empty", role:"status"}, icon(go, 24), t("analyzing")) :
              selectedResult?.status === "ok" && selectedResult.series?.length && selectedResult.codes?.length ? h(TerraEarthbeatPanel, {key:`${regionId}:${param}:${mode}:${refresh}`, result:selectedResult, lang, mode, visible:!narrow || mobileView === "insights"}) :
              h("div", {className:"terra-empty"}, icon(yo, 32), h("strong", null, region ? text("No chart available", "ဂရပ် မရရှိပါ") : text("Your graph appears here", "ဂရပ်ကို ဤနေရာတွင် ပြပါမည်")),
                h("p", null, selectedResult?.message || (region ? text("Try another measurement or date range.", "အခြားဒေတာ သို့မဟုတ် ရက်စွဲကို ရွေးပါ။") : text("Choose a location to see its measurements over time.", "အချိန်အလိုက် ဒေတာကြည့်ရန် နေရာရွေးပါ။"))))),
            h("section", {className:"terra-panel terra-details"},
              panelTitle(text("Details & insights", "အသေးစိတ်နှင့် သုံးသပ်ချက်များ")),
              result ? h(ft.Fragment, null,
                h("div", {className:"terra-location-detail"}, h("h3", null, name(result.region)), h("p", null, `${result.region.lat.toFixed(2)}°N, ${result.region.lon.toFixed(2)}°E · NASA POWER`)),
                selectedResult && h(b9e, {r:selectedResult}), h("p", {className:"terra-summary"}, result.summary),
                h("p", {className:"terra-scope-note"}, t("pointBased")),
                notes(result.insights || []), notes(result.implications || []),
                result.evidence && h(o1, {ev:result.evidence}),
                h("details", {className:"terra-disclosure"}, h("summary", null, t("sources")), (result.sources || []).map(source=>h("a", {key:source.id, href:source.url, target:"_blank", rel:"noreferrer"}, source.name, " ↗")),
                  h("p", null, `${t("retrieved")}: ${new Date(result.retrievedAt).toLocaleString()}`)),
                h("details", {className:"terra-disclosure"}, h("summary", null, t("limitations")), h("ul", null, (result.limitations || []).map((item,index)=>h("li", {key:index}, item))))) :
                h("div", {className:"terra-empty terra-empty-details"}, icon(ds, 24), h("p", null, text("Select an area on the map or use the location selector. Sources and observation dates will appear with your results.", "မြေပုံပေါ်မှ သို့မဟုတ် စာရင်းမှ နေရာရွေးပါ။ ရင်းမြစ်နှင့် ရက်စွဲများကို ရလဒ်နှင့်အတူ ပြပါမည်။"))))))))), h(TerraDashboardChat, {key:`${regionId}:${mode}`, lang, t, region, param, mode, expanded:chatOpen, setExpanded:setChatOpen}));
}

function TerraDashboardChat({lang, t, region, param, mode, expanded, setExpanded}) {
  const h = ft.createElement;
  const [messages, setMessages] = ft.useState([]);
  const [input, setInput] = ft.useState("");
  const [busy, setBusy] = ft.useState(false);
  const [sessionId] = ft.useState(()=>crypto.randomUUID());
  const request = ft.useRef(null);
  const thread = ft.useRef(null);
  const launcher = ft.useRef(null);
  const closeButton = ft.useRef(null);
  const text = (en, my) => lang === "my" ? my : en;
  function closeChat() { setExpanded(false); launcher.current?.focus(); }
  ft.useEffect(()=>{
    if (!expanded) return;
    closeButton.current?.focus();
    const onKeyDown = event => { if (event.key === "Escape") closeChat(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);
  ft.useEffect(()=>()=>request.current?.abort(), []);
  ft.useEffect(()=>{ if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; }, [messages, busy]);
  async function send(question) {
    if (!question.trim() || busy || !region) return;
    const controller = new AbortController();
    request.current = controller;
    const content = question.trim();
    const history = messages.filter(item=>!item.error).slice(-6).map(item=>({role:item.role, content:item.content}));
    setInput(""); setBusy(true);
    setMessages(previous=>[...previous, {role:"user", content}]);
    try {
      const response = await fetch("/api/chat", {method:"POST", signal:controller.signal,
        headers:{"content-type":"application/json"}, body:JSON.stringify({message:content, sessionId, selectedRegionId:region.id, mode, history})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not retrieve an answer.");
      setMessages(previous=>[...previous, {role:"assistant", content:data.answer, evidence:data.evidence, sources:data.sources,
        meta:`${data.region.name} · ${data.period?.start || ""} → ${data.period?.end || ""} · ${data.generator === "llm" ? "AI-written" : "template"}`}]);
    } catch (err) {
      if (!controller.signal.aborted) setMessages(previous=>[...previous, {role:"assistant", content:err.message, error:true}]);
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const question = region ? (lang === "my" ? `${region.nameMy}၏ ${Ha[param].labelMy} အချက်အလက်များကို ရှင်းပြပါ။` : `Explain the recent ${Ha[param].label.toLowerCase()} measurements in ${region.name}.`) : "";
  return h(ft.Fragment, null,
    h("button", {ref:launcher, type:"button", className:"terra-chat-launcher", onClick:()=>setExpanded(value=>!value), "aria-label":text("AI chat", "AI စကားပြောရန်"), "aria-expanded":expanded, "aria-controls":"ai-chat", title:t("chatTitle")}, h(expanded ? xo : vo, {width:24,height:24,"aria-hidden":true})),
    expanded && h("section", {id:"ai-chat", role:"dialog", className:"terra-chat terra-panel terra-floating-chat is-expanded", "aria-label":t("chatTitle")},
    h("div", {className:"terra-chat-heading"}, h("div", null, h(vo, {width:20, height:20}), h("h2", null, t("chatTitle")),
      h("span", null, region ? (lang === "my" ? region.nameMy : region.name) : text("Choose a location", "နေရာရွေးပါ"))),
      h("button", {ref:closeButton, type:"button", onClick:closeChat, "aria-label":text("Close AI chat", "AI စကားပြော ပိတ်ရန်")}, h(xo,{width:18,height:18,"aria-hidden":true}))),
    expanded && h("div", {id:"terra-chat-body"},
      h("div", {className:"terra-chat-thread", ref:thread, role:"log", "aria-live":"polite", "aria-relevant":"additions"},
        messages.length === 0 && h("div", {className:"terra-chat-welcome"},
          h("p", null, text("Ask about the conditions behind the map.", "မြေပုံပေါ်ရှိ အခြေအနေများအကြောင်း မေးမြန်းပါ။")),
          region && h("button", {className:"terra-suggestion", onClick:()=>send(question)}, question, " ↗")),
        messages.map((message,index)=>h("div", {key:index, className:`terra-message ${message.role} ${message.error ? "error" : ""}`},
          h("p", null, message.content), message.meta && h("small", null, message.meta),
          message.evidence && h(o1, {ev:message.evidence, compact:true}),
          message.sources && h("div", {className:"terra-chat-sources"}, message.sources.map(source=>h("a", {key:source.url, href:source.url, target:"_blank", rel:"noreferrer"}, source.name, " ↗"))))),
        busy && h("p", {role:"status", className:"terra-chat-welcome"}, text("Checking NASA data…", "NASA ဒေတာ စစ်ဆေးနေသည်…"))),
      h("form", {className:"terra-chat-form", onSubmit:event=>{event.preventDefault();send(input);}},
        h("input", {value:input, onChange:event=>setInput(event.target.value), maxLength:1000, disabled:!region,
          placeholder:region ? t("chatPlaceholder") : text("Select a location to start a conversation", "စကားပြောရန် နေရာရွေးပါ"), "aria-label":t("chatPlaceholder")}),
        h("button", {type:"submit", disabled:busy || !input.trim() || !region, "aria-label":t("send")}, h(wd, {width:18, height:18}))))));
}
