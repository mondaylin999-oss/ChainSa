import { readFile, writeFile, mkdir } from "node:fs/promises";

// Keep the supplied standalone design intact and apply the live-app adapter at build time.
const source = await readFile(new URL("../reference/earthlens.html", import.meta.url), "utf8");
const adapter = await readFile(new URL("./earthlens-adapter.js", import.meta.url), "utf8");
const dashboard = await readFile(new URL("./earthlens-dashboard.js", import.meta.url), "utf8");
const dashboardCss = await readFile(new URL("./earthlens-dashboard.css", import.meta.url), "utf8");
const start = source.indexOf('window.fetch=async(e,t)=>');
const end = source.indexOf('(0,uq.createRoot)', start);
if (start < 0 || end < 0) throw new Error("The reference entry point changed; review the adapter.");
const componentStart = source.indexOf("function Og(){");
const componentEnd = source.indexOf("var bj=", componentStart);
if (componentStart < 0 || componentEnd < 0 || componentEnd > start) {
  throw new Error("The reference dashboard changed; review the dashboard adapter.");
}
const html = (source.slice(0, componentStart) + dashboard + "\n" + source.slice(componentEnd, start) + adapter + source.slice(end))
  .replace("</head>", `<style>${dashboardCss}</style></head>`)
  .replace("Myanmar EarthLens — Demo preview", "Myanmar EarthLens — NASA environmental insights")
  .replace('Naypyidaw shown as a point: bundled boundary data includes it within Mandalay. Run ', 'Naypyidaw is shown as a representative point. ')
  .replace('(0,Je.jsx)("code",{children:"npm run boundaries:fetch"})," for geoBoundaries ADM1."', '"The map boundary includes it within Mandalay."')
  .replace('computed by deterministic server code.', 'computed by checking measurable claims against the retrieved data.')
  .replace('and NASA FIRMS satellite fire detections.', 'with fire data shown when available.');
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/earthlens.html", import.meta.url), html);
