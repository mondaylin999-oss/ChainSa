import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";

// Keep the supplied standalone design intact and apply the live-app adapter at build time.
let source = await readFile(new URL("../reference/earthlens.html", import.meta.url), "utf8");
function replaceOnce(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`The reference ${label} changed; review the township map adapter.`);
  return source.replace(needle, replacement);
}
source = replaceOnce(source,
  "function gj({regions:e,boundaries:t,selectedId:a,onSelect:r,fires:n,loading:i}){let{t:s,lang:u}=On(),c=e.find(g=>g.id===a)?.iso,",
  "function gj({regions:e,boundaries:t,selectedId:a,onSelect:r,fires:n,loading:i,townships:Y,townshipBoundaries:V,selectedTownshipId:W,onSelectTownship:X}){let{t:s,lang:u}=On(),townshipStyle=feature=>{let selected=feature.properties.TS_PCODE===W;return{color:selected?\"#ffd166\":\"rgba(124,199,255,.65)\",weight:selected?2.5:.65,fillColor:\"#2b8fe8\",fillOpacity:selected ? .32 : 0}},c=e.find(g=>g.id===a)?.iso,",
  "township map layer arguments");
source = replaceOnce(source,
  "},`${t.source}-${u}-${c}`),e.map(g=>",
  "},`${t.source}-${u}-${c}`),V&&Y?.length&&(0,Je.jsx)(Lg,{data:V,style:townshipStyle,onEachFeature:(feature,layer)=>{let township=Y.find(item=>item.id===feature.properties.TS_PCODE);if(!township)return;layer.bindTooltip(u===\"my\"?township.nameMy:township.name,{sticky:!0,className:\"region-tip\",direction:\"top\"}),layer.on({mouseover:x=>x.target.setStyle({...townshipStyle(feature),color:\"#8ae6b0\",weight:1.5,fillOpacity:.14}),mouseout:x=>x.target.setStyle(townshipStyle(feature)),click:()=>X?.(township.id)})},attribution:\"Township boundaries: MIMU PCode v9.4\"},`townships-${u}-${a}-${Y.length}`),e.map(g=>",
  "township GeoJSON layer");
source = replaceOnce(source,
  "(0,Je.jsx)(C9e,{regions:e,boundaries:t,selectedId:a})",
  "(0,Je.jsx)(C9e,{regions:e,boundaries:t,selectedId:a,townshipBoundaries:V,selectedTownshipId:W})",
  "township map camera props");
source = replaceOnce(source,
  's("legendSelected")]}),(0,Je.jsxs)("div",{className:"flex items-center gap-2",children:',
  's("legendSelected")]}),(0,Je.jsxs)("div",{className:"flex items-center gap-2",children:V?[(0,Je.jsx)("span",{className:"h-px w-4 bg-slate-300"}),"Township boundary"]:null}),(0,Je.jsxs)("div",{className:"flex items-center gap-2",children:',
  "township legend row");
source = replaceOnce(source,
  "function C9e({regions:e,boundaries:t,selectedId:a}){let r=Sg(),n=(0,Ii.useRef)(()=>{});return n.current=()=>{let i=e.find(u=>u.id===a);",
  "function C9e({regions:e,boundaries:t,selectedId:a,townshipBoundaries:c,selectedTownshipId:f}){let r=Sg(),n=(0,Ii.useRef)(()=>{});return n.current=()=>{let township=c?.features.find(feature=>feature.properties.TS_PCODE===f);if(township){r.flyToBounds(pj.default.geoJSON(township).getBounds(),{padding:[28,28],duration:.9,maxZoom:9});return}let i=e.find(u=>u.id===a);",
  "township zoom handling");
source = replaceOnce(source,
  "},[a,t,e,r]),(0,Ii.useEffect)(()=>{let i=r.getContainer()",
  "},[a,t,e,r,c,f]),(0,Ii.useEffect)(()=>{let i=r.getContainer()",
  "township map camera dependencies");
source = replaceOnce(source,
  "e.map(g=>(0,Je.jsx)(rm,{center:[g.lat,g.lon]",
  "V?.features.map(feature=>{let township=Y.find(item=>item.id===feature.properties.TS_PCODE);if(!township)return null;let center=pj.default.geoJSON(feature).getBounds().getCenter();return(0,Je.jsx)(rm,{center,radius:township.id===W?7:4,pathOptions:{color:township.id===W?\"#ffffff\":\"#7cc7ff\",weight:1,fillColor:township.id===W?\"#4fd18b\":\"#2b8fe8\",fillOpacity:.95},eventHandlers:{click:()=>X?.(township.id)},children:(0,Je.jsx)(nm,{className:\"region-tip\",children:u===\"my\"?township.nameMy:township.name})},township.id)}),!a&&e.map(g=>(0,Je.jsx)(rm,{center:[g.lat,g.lon]",
  "region and township marker drilldown");
source = replaceOnce(source,
  'p=g=>{let w=g.properties.iso===c;return{color:',
  'p=g=>{let w=g.properties.iso===c;return{className:c&&!w?"terra-region-unfocused":"",color:',
  "unfocused region styling");
source = replaceOnce(source,
  'color:w?"#7cc7ff":"rgba(148,190,255,0.45)",weight:w?2.5:1,fillColor:w?"#2b8fe8":h[g.properties.iso]?.coastal?"#1f6a8a":"#2c6b4f",fillOpacity:w?.45:.22',
  'color:"rgba(148,190,255,0.45)",weight:1,fillColor:h[g.properties.iso]?.coastal?"#1f6a8a":"#2c6b4f",fillOpacity:.22',
  "preserve original region appearance when selected");
const adapter = await readFile(new URL("./earthlens-adapter.js", import.meta.url), "utf8");
const dashboard = await readFile(new URL("./earthlens-dashboard.js", import.meta.url), "utf8");
const dashboardCss = await readFile(new URL("./earthlens-dashboard.css", import.meta.url), "utf8");
const earthbeatSource = await readFile(new URL("../src/features/earthbeat/core.ts", import.meta.url), "utf8");
const earthbeatCore = ts.transpileModule(earthbeatSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace(/^export /gm, "");
const earthbeatPanel = await readFile(new URL("./earthbeat-panel.js", import.meta.url), "utf8");
const environmentalFiles = ["processing/statistics.ts", "analysis/explainChanges.ts", "analysis/dataTrendInsight.ts", "components/chartModel.ts", "components/EnvironmentalChart.tsx", "components/DataTrendInsight.tsx"];
let environmentalModule = "";
for (const file of environmentalFiles) {
  const input = await readFile(new URL(`../src/features/environmental/${file}`, import.meta.url), "utf8");
  environmentalModule += ts.transpileModule(input, {fileName:file, compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext, jsx:ts.JsxEmit.React, jsxFactory:"ft.createElement"}}).outputText
    .replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "").replace(/\buseMemo\(/g,"ft.useMemo(").replace(/\buseState\(/g,"ft.useState(") + "\n";
}
const earthbeatCss = await readFile(new URL("./earthbeat-panel.css", import.meta.url), "utf8");
const start = source.indexOf('window.fetch=async(e,t)=>');
const end = source.indexOf('(0,uq.createRoot)', start);
if (start < 0 || end < 0) throw new Error("The reference entry point changed; review the adapter.");
const componentStart = source.indexOf("function Og(){");
const componentEnd = source.indexOf("var bj=", componentStart);
if (componentStart < 0 || componentEnd < 0 || componentEnd > start) {
  throw new Error("The reference dashboard changed; review the dashboard adapter.");
}
// Omit the archived reference's seeded sample generator from the production application.
const liveReference = source.slice(componentEnd, start)
  .replace('if(a==="demo")return N9e(e,t,r);', "")
  .replace(/function Uj\(e\)\{[\s\S]*?(?=var B9e=)/, "");
if (liveReference.includes("function N9e(") || liveReference.includes("return N9e(")) {
  throw new Error("The reference sample generator changed; review live-only preparation.");
}
const html = (source.slice(0, componentStart) + earthbeatCore + "\n" + environmentalModule + "\n" + earthbeatPanel + "\n" + dashboard + "\n" + liveReference + adapter + source.slice(end))
  .replace("</head>", `<style>${dashboardCss}\n${earthbeatCss}</style></head>`)
  .replace("minZoom:5,zoomSnap:.25", "minZoom:3.5,zoomSnap:.25")
  .replace("Myanmar EarthLens — Demo preview", "Myanmar EarthLens — NASA environmental insights")
  .replace('Naypyidaw shown as a point: bundled boundary data includes it within Mandalay. Run ', 'Naypyidaw is shown as a representative point. ')
  .replace('(0,Je.jsx)("code",{children:"npm run boundaries:fetch"})," for geoBoundaries ADM1."', '"The map boundary includes it within Mandalay."')
  .replace('computed by deterministic server code.', 'computed by checking measurable claims against the retrieved data.')
  .replace('and NASA FIRMS satellite fire detections.', 'with fire data shown when available.');
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/earthlens.html", import.meta.url), html);
