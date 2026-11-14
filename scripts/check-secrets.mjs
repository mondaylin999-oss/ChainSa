// Run after `npm run build`: fails if any API key value or key-shaped string appears in browser bundles.
// Usage: npm run check:secrets
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const staticDir = join(root, ".next", "static");
if (!existsSync(staticDir)) {
  console.error("No .next/static folder — run `npm run build` first.");
  process.exit(2);
}

const secretNames = ["OPENROUTER_API_KEY", "GROQ_API_KEY", "NASA_FIRMS_MAP_KEY", "FIRMS_MAP_KEY"];
const values = [];
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && secretNames.includes(m[1]) && m[2].length >= 8) values.push({ name: m[1], value: m[2] });
  }
}
const patterns = [/sk-or-v1-[A-Za-z0-9]{20,}/, /gsk_[A-Za-z0-9]{20,}/, /OPENROUTER_API_KEY|GROQ_API_KEY|FIRMS_MAP_KEY/];

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})(staticDir);

let problems = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const { name, value } of values) if (text.includes(value)) { console.error(`LEAK: value of ${name} found in ${f}`); problems++; }
  for (const re of patterns) if (re.test(text)) { console.error(`LEAK: pattern ${re} found in ${f}`); problems++; }
}
console.log(`Scanned ${files.length} browser files, ${values.length} configured key value(s).`);
if (problems) process.exit(1);
console.log("OK — no secrets found in browser bundles.");
