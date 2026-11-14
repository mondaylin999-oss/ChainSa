/** EARTHBEAT graph/player, adapted to the host bundle's React and measurement model. */
function TerraEarthbeatPanel({result, lang, mode, visible}) {
  const h = ft.createElement;
  const text = (en, my) => lang === "my" ? my : en;
  const [code, setCode] = ft.useState(result.codes[0]);
  const [active, setActive] = ft.useState(-1);
  const [hover, setHover] = ft.useState(-1);
  const [state, setState] = ft.useState("paused");
  const [volume, setVolume] = ft.useState(0.15);
  const [speed, setSpeed] = ft.useState(4);
  const [error, setError] = ft.useState("");
  const engine = ft.useRef(null);
  const dragging = ft.useRef(false);
  const lastPointerIndex = ft.useRef(-1);
  const supported = typeof window.AudioContext === "function";
  const points = ft.useMemo(()=>earthbeatObservations(result.series, code), [result.series, code]);
  const range = ft.useMemo(()=>earthbeatRange(points), [points]);
  const valid = points.filter(point=>point.value !== null);
  const config = Ha[result.param];
  const unit = code === "WD2M" ? "°" : config.unit;
  const label = NB[code] || code;
  const current = points[active];
  const inspected = points[hover] || current;
  const format = value => new Intl.NumberFormat(lang === "my" ? "my" : "en", {maximumFractionDigits:3}).format(value);
  const formatTick = value => new Intl.NumberFormat(lang === "my" ? "my" : "en", {maximumSignificantDigits:3}).format(value);
  ft.useEffect(()=>{
    const player = new EarthbeatEngine(index=>setActive(index), setState);
    player.load(points);
    engine.current = player;
    setActive(-1); setHover(-1); setError("");
    const stopWhenHidden = () => { if (document.hidden) player.pause(); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => { document.removeEventListener("visibilitychange", stopWhenHidden); player.dispose(); engine.current = null; };
  }, [points]);
  ft.useEffect(()=>{ engine.current?.setVolume(volume); engine.current?.setSpeed(speed); }, [volume, speed, points]);
  ft.useEffect(()=>{ if (!visible) engine.current?.pause(); }, [visible]);
  function run(action) {
    setError("");
    try { Promise.resolve(action()).catch(()=>setError(text("Audio could not start. Try Play again or check your browser sound settings.", "အသံ မဖွင့်နိုင်ပါ။ Play ကို ပြန်နှိပ်ပါ သို့မဟုတ် ဘရောက်ဇာ အသံဆက်တင်ကို စစ်ဆေးပါ။"))); }
    catch { setError(text("This browser could not start audio.", "ဤဘရောက်ဇာတွင် အသံ မဖွင့်နိုင်ပါ။")); }
  }
  function select(index) {
    if (index < 0 || !points[index] || points[index].value === null) return;
    setHover(-1); setActive(index);
    if (supported) run(()=>engine.current?.seek(index));
  }
  const left = 51, right = 582, top = 16, bottom = 193;
  const pad = Math.max((range[1] - range[0]) * 0.12, Math.abs(range[0]) * 0.02, 0.1);
  const yMin = range[0] >= 0 ? Math.max(0, range[0] - pad) : range[0] - pad, yMax = range[1] + pad;
  const x = point => left + earthbeatTimeFraction(point, points) * (right-left);
  const y = value => bottom - (value-yMin)/(yMax-yMin)*(bottom-top);
  // Missing observations break the line; they are never converted to zero or sounded.
  let path = "", connected = false;
  for (const point of points) {
    if (point.value === null) { connected = false; continue; }
    path += `${connected ? "L" : "M"}${x(point)},${y(point.value)} `;
    connected = true;
  }
  function pointerIndex(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return earthbeatNearest(points, ((event.clientX-bounds.left)/bounds.width*600-left)/(right-left));
  }
  function pointerDown(event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    const index = pointerIndex(event);
    lastPointerIndex.current = index;
    select(index);
  }
  function pointerMove(event) {
    const index = pointerIndex(event);
    if (dragging.current) {
      if (index !== lastPointerIndex.current) { lastPointerIndex.current = index; select(index); }
    } else if (state !== "playing") setHover(index);
  }
  function keyboard(event) {
    const indices = points.map((point,index)=>point.value !== null ? index : -1).filter(index=>index >= 0);
    const position = Math.max(0, indices.indexOf(active));
    let next;
    if (event.key === "ArrowRight") next = indices[Math.min(indices.length-1, position+1)];
    if (event.key === "ArrowLeft") next = indices[Math.max(0, position-1)];
    if (event.key === "Home") next = indices[0];
    if (event.key === "End") next = indices.at(-1);
    if (next !== undefined) { event.preventDefault(); select(next); }
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggle(); }
  }
  function toggle() { setHover(-1); if (state === "playing") engine.current?.pause(); else run(()=>engine.current?.play()); }
  const hasData = valid.length > 0;
  return h("div", {className:"earthbeat", "data-playback":state},
    result.codes.length > 1 && h("label", {className:"earthbeat-channel"}, text("Measurement", "တိုင်းတာချက်"),
      h("select", {value:code, onChange:event=>setCode(event.target.value)}, result.codes.map(item=>h("option", {key:item,value:item}, NB[item] || item)))),
    hasData ? h(ft.Fragment, null,
      h("p", {className:"earthbeat-readout", "aria-live":state === "playing" ? "off" : "polite"}, inspected ? `${inspected.date} · ${format(inspected.value)} ${unit}` : text("Touch the graph to hear a measurement", "တိုင်းတာချက်အသံ ကြားရန် ဂရပ်ကို ထိပါ")),
      h("svg", {className:"earthbeat-graph",viewBox:"0 0 600 225",role:"slider",tabIndex:0,
        "aria-label":text("Interactive observation graph", "အသံနှင့် ချိတ်ဆက်ထားသော ဂရပ်"),"aria-valuemin":0,"aria-valuemax":Math.max(0,points.length-1),"aria-valuenow":Math.max(0,active),
        "aria-valuetext":current ? `${current.date}: ${current.value} ${unit}` : text("No observation selected", "တိုင်းတာချက် မရွေးရသေးပါ"),
        onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:()=>{dragging.current=false;},onPointerCancel:()=>{dragging.current=false;},onLostPointerCapture:()=>{dragging.current=false;},onPointerLeave:()=>{if(!dragging.current)setHover(-1);},onKeyDown:keyboard},
        h("title", null, `${lang === "my" ? config.labelMy : config.label} · ${label}`),
        [0,1,2,3,4].map(tick=>{const value=yMin+(yMax-yMin)*tick/4;return h("g",{key:tick},h("line",{x1:left,x2:right,y1:y(value),y2:y(value),className:"earthbeat-grid"}),h("text",{x:left-8,y:y(value)+4,textAnchor:"end"},formatTick(value)));}),
        result.param === "rainfall" ? points.filter(point=>point.value!==null).map(point=>h("line",{key:point.date,x1:x(point),x2:x(point),y1:y(0),y2:y(point.value),className:"earthbeat-bar",strokeWidth:Math.max(2,Math.min(22,(right-left)/points.length*0.55))})) : h("path",{d:path,className:"earthbeat-line"}),
        valid.map(point=>h("circle",{key:point.date,cx:x(point),cy:y(point.value),r:2.5,className:"earthbeat-point"})),
        inspected && h("g", null,h("line",{x1:x(inspected),x2:x(inspected),y1:top,y2:bottom,className:"earthbeat-cursor"}),h("circle",{cx:x(inspected),cy:y(inspected.value),r:5,className:"earthbeat-selected"})),
        h("text",{x:left,y:217},points[0].date.slice(5)),h("text",{x:right,y:217,textAnchor:"end"},points.at(-1).date.slice(5)))) :
      h("p",{className:"earthbeat-readout"},text("No valid measurements to graph or play.", "ဂရပ်နှင့် အသံအတွက် မှန်ကန်သော ဒေတာ မရှိပါ။")),
    h("div",{className:"earthbeat-player"},
      h("div",{className:"earthbeat-player-heading"},h("strong",null,"EARTHBEAT"),h("span",null,text("Graph ↔ sound", "ဂရပ် ↔ အသံ"))),
      h("div",{className:"earthbeat-buttons"},h("button",{type:"button",onClick:toggle,disabled:!supported||!hasData,"aria-pressed":state==="playing"},text(state==="playing" ? "Pause" : "Play",state==="playing" ? "ခေတ္တရပ်" : "ဖွင့်ရန်")),
        h("button",{type:"button",onClick:()=>{setHover(-1);engine.current?.restart();},disabled:!hasData},text("Restart", "အစမှပြန်စ")),
        h("span",{className:"earthbeat-state",role:"status"},text(state==="playing"?"Playing":state==="ended"?"Finished":"Paused",state==="playing"?"ဖွင့်နေသည်":state==="ended"?"ပြီးပါပြီ":"ရပ်ထားသည်"))),
      h("div",{className:"earthbeat-settings"},h("label",null,text("Volume", "အသံအတိုးအကျယ်"),h("input",{type:"range",min:0,max:1,step:0.01,value:volume,onChange:event=>setVolume(Number(event.target.value)),"aria-label":text("Sound volume", "အသံအတိုးအကျယ်")})),
        h("label",null,text("Speed", "အမြန်နှုန်း"),h("select",{value:speed,onChange:event=>setSpeed(Number(event.target.value))},[1,2,4,8].map(value=>h("option",{key:value,value},`${value}/s`))))),
      h("p",{className:"earthbeat-help"},text("Tap or drag to hear a point; Play continues from there. Arrow keys select points. Higher value = higher pitch.", "အမှတ်တစ်ခု၏ အသံကြားရန် ထိပါ သို့မဟုတ် ဆွဲပါ။ Play သည် ထိုနေရာမှ ဆက်ဖွင့်သည်။ မြှားခလုတ်များဖြင့် ရွေးနိုင်သည်။ တန်ဖိုးမြင့်လျှင် အသံမြင့်သည်။")),
      h("p",{className:"earthbeat-scale"},text(`Relative pitch: ${format(range[0])}–${format(range[1])} ${unit} → 220–880 Hz. Equal playback steps; date gaps remain visible in the graph. Missing data is silent. Synthesized tones${mode==="demo"?" from DEMO data":""}.`, `နှိုင်းရအသံ: ${format(range[0])}–${format(range[1])} ${unit} → 220–880 Hz။ ဒေတာတစ်ခုစီကို တူညီသောအချိန်ဖြင့် ဖွင့်သည်။ ဒေတာမရှိလျှင် အသံမရှိပါ။ ${mode==="demo"?"နမူနာဒေတာမှ ":""}ဖန်တီးထားသော အသံများ။`)),
      !supported && h("p",{role:"status"},text("Sound is unavailable in this browser. The graph remains interactive.", "ဤဘရောက်ဇာတွင် အသံ မရရှိပါ။ ဂရပ်ကို ရွေးကြည့်နိုင်ပါသည်။")),
      error && h("p",{role:"alert",className:"terra-error"},error)));
}
