import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";

// Keep the supplied standalone design intact and apply the live-app adapter at build time.
const source = await readFile(new URL("../reference/earthlens.html", import.meta.url), "utf8");
const adapter = await readFile(new URL("./earthlens-adapter.js", import.meta.url), "utf8");
const dashboard = await readFile(new URL("./earthlens-dashboard.js", import.meta.url), "utf8");
const dashboardCss = await readFile(new URL("./earthlens-dashboard.css", import.meta.url), "utf8");
const earthbeatSource = await readFile(new URL("../src/features/earthbeat/core.ts", import.meta.url), "utf8");
const earthbeatCore = ts.transpileModule(earthbeatSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace(/^export /gm, "");
const earthbeatPanel = await readFile(new URL("./earthbeat-panel.js", import.meta.url), "utf8");
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
const html = (source.slice(0, componentStart) + earthbeatCore + "\n" + earthbeatPanel + "\n" + dashboard + "\n" + liveReference + adapter + source.slice(end))
  .replace("</head>", `<style>${dashboardCss}\n${earthbeatCss}</style></head>`)
  .replace("Myanmar EarthLens — Demo preview", "Myanmar EarthLens — NASA environmental insights")
  .replace('Naypyidaw shown as a point: bundled boundary data includes it within Mandalay. Run ', 'Naypyidaw is shown as a representative point. ')
  .replace('(0,Je.jsx)("code",{children:"npm run boundaries:fetch"})," for geoBoundaries ADM1."', '"The map boundary includes it within Mandalay."')
  .replace('computed by deterministic server code.', 'computed by checking measurable claims against the retrieved data.')
  .replace('and NASA FIRMS satellite fire detections.', 'with fire data shown when available.');
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/earthlens.html", import.meta.url), html);
