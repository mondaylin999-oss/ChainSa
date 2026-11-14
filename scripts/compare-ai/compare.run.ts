/**
 * AI on/off comparison for the EarthLens chatbot.
 *
 *   npm run compare:ai                      → real comparison (needs OPENROUTER_API_KEY and/or GROQ_API_KEY in .env.local)
 *   COMPARE_ALLOW_NO_KEYS=1 npm run compare:ai   → template-only dry run (checks the script and NASA access)
 *   COMPARE_LIMIT=4 npm run compare:ai      → only the first 4 questions
 *
 * Each question is answered twice with the SAME NASA data (cached in memory): once with AI switched off
 * (template) and once with the configured free AI models. Results go to reports/ai-comparison-<time>.html and .json.
 * Keys are read on the server side only and are never written to the report.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "vitest";
import { answerChat } from "@/features/earthlens-chat/server/handler";
import { getConfig } from "@/features/earthlens-chat/server/env";
import type { ChatResponseBody } from "@/features/earthlens-chat/types";
import { QUESTIONS, type CompareQuestion } from "./questions";

interface Side {
  ms: number;
  error: string | null;
  r: ChatResponseBody | null;
}
interface Row {
  q: CompareQuestion;
  off: Side;
  on: Side | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ask(q: CompareQuestion, cfg: ReturnType<typeof getConfig>): Promise<Side> {
  const t0 = Date.now();
  try {
    const r = await answerChat({ message: q.message, selectedRegionId: q.selectedRegionId }, { config: cfg });
    return { ms: Date.now() - t0, error: null, r };
  } catch (e) {
    return { ms: Date.now() - t0, error: (e as Error).message, r: null };
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function answerHtml(s: Side | null): string {
  if (!s) return `<p class="muted">AI not run (no keys).</p>`;
  if (s.error) return `<p class="err">Error: ${esc(s.error)}</p>`;
  const r = s.r!;
  const p = r.summaryParts;
  const body = p
    ? `<p><b>Region:</b> ${esc(p.region)}</p><p><b>Key findings:</b> ${esc(p.keyFindings)}</p><p><b>Key recommendation:</b> ${esc(p.recommendation)}</p>`
    : `<p>${esc(r.summary || r.answer.slice(0, 600))}</p>`;
  const cards = r.actionCards?.length ? `<p class="muted">Cards: ${r.actionCards.map((c) => `${esc(c.title)} (${c.confidence.level})`).join(", ")}</p>` : "";
  return body + cards;
}

function infoHtml(s: Side | null): string {
  if (!s || !s.r) return "";
  const r = s.r;
  const att = r.attempts.map((a) => `${a.provider}/${esc(a.model)}: ${a.outcome}`).join("<br>");
  const ver = r.verification ? `${r.verification.numbersVerified}/${r.verification.numbersChecked} numbers verified` : "—";
  const who = r.generator === "llm" ? `<span class="ok">AI · ${esc(r.provider ?? "")} · ${esc(r.model ?? "")}</span>` : `<span class="muted">template</span>`;
  return `${who}<br>${(s.ms / 1000).toFixed(1)} s · ${ver}${att ? `<br><span class="muted small">${att}</span>` : ""}`;
}

function report(rows: Row[], meta: { started: string; aiRun: boolean; models: string }): string {
  const on = rows.map((x) => x.on).filter((x): x is Side => !!x && !!x.r);
  const llm = on.filter((s) => s.r!.generator === "llm");
  const byProv = (p: string) => llm.filter((s) => s.r!.provider === p).length;
  const rejected = on.flatMap((s) => s.r!.attempts.filter((a) => a.outcome !== "ok").map((a) => a.outcome));
  const reasons = Object.entries(rejected.reduce<Record<string, number>>((m, o) => ((m[o] = (m[o] ?? 0) + 1), m), {}))
    .map(([k, v]) => `${k}: ${v}`).join(", ") || "none";
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length / 1000 : 0);
  const myAi = llm.filter((s) => s.r!.lang === "my").length;
  const stats = meta.aiRun
    ? `<ul>
        <li>AI wrote the answer: <b>${llm.length}/${on.length}</b> (OpenRouter ${byProv("openrouter")}, Groq ${byProv("groq")}, template fallback ${on.length - llm.length})</li>
        <li>AI answers in Myanmar: ${myAi}/${rows.filter((r) => r.q.lang === "my").length}</li>
        <li>Rejected or failed AI attempts: ${esc(reasons)}</li>
        <li>Average time — template: ${avg(rows.map((x) => x.off.ms)).toFixed(1)} s · with AI: ${avg(on.map((s) => s.ms)).toFixed(1)} s</li>
      </ul>`
    : `<p class="err">Dry run: no AI keys were found, so only template answers are shown. Add OPENROUTER_API_KEY and/or GROQ_API_KEY to .env.local and run again.</p>`;
  const tr = rows
    .map((x) => `<tr>
      <td><b>${esc(x.q.id)}</b><br><span class="muted">${esc(x.q.topic)}</span></td>
      <td lang="${x.q.lang}">${esc(x.q.message)}${x.q.selectedRegionId ? `<br><span class="muted">map: ${esc(x.q.selectedRegionId)}</span>` : ""}</td>
      <td lang="${x.q.lang}">${answerHtml(x.off)}<p class="muted small">${(x.off.ms / 1000).toFixed(1)} s</p></td>
      <td lang="${x.q.lang}">${answerHtml(x.on)}</td>
      <td class="small">${infoHtml(x.on)}</td>
      <td class="rate">Better: ☐ template ☐ AI ☐ same<br>Burmese OK: ☐ yes ☐ no<br>Notes:</td>
    </tr>`)
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EarthLens AI comparison</title>
<style>
  body{font-family:Inter,"Padauk","Myanmar Text",system-ui,sans-serif;margin:24px;color:#0f172a;background:#f8fafc}
  h1{font-size:20px;margin:0 0 4px} .muted{color:#64748b} .small{font-size:12px} .err{color:#b91c1c} .ok{color:#047857;font-weight:600}
  table{border-collapse:collapse;width:100%;background:#fff;font-size:13px} th,td{border:1px solid #e2e8f0;padding:8px;vertical-align:top;text-align:left}
  th{background:#e0f2fe;position:sticky;top:0} td p{margin:0 0 6px} [lang=my]{line-height:1.8} .rate{font-size:12px;width:150px}
  @media print{th{position:static}}
</style></head><body>
<h1>EarthLens chatbot — template vs AI</h1>
<p class="muted">Run ${esc(meta.started)} · models: ${esc(meta.models)} · same NASA data for both columns · tick the boxes when reviewing (print or edit).</p>
${stats}
<table><thead><tr><th>#</th><th>Question</th><th>Template (AI off)</th><th>AI on</th><th>AI details</th><th>Your rating</th></tr></thead>
<tbody>${tr}</tbody></table>
</body></html>`;
}

test("compare template vs AI answers", async () => {
  const cfg = getConfig();
  const hasKeys = Boolean(cfg.openrouter.apiKey && cfg.openrouter.models.length) || Boolean(cfg.groq.apiKey && cfg.groq.models.length);
  const allowNoKeys = process.env.COMPARE_ALLOW_NO_KEYS === "1";
  if (!hasKeys && !allowNoKeys)
    throw new Error("No AI keys found. Add OPENROUTER_API_KEY and/or GROQ_API_KEY to .env.local (see .env.example), or set COMPARE_ALLOW_NO_KEYS=1 for a template-only dry run.");

  const off = { ...cfg, openrouter: { ...cfg.openrouter, apiKey: "" }, groq: { ...cfg.groq, apiKey: "" } };
  const limit = Number(process.env.COMPARE_LIMIT) || QUESTIONS.length;
  const delay = Number(process.env.COMPARE_DELAY_MS ?? 4000); // stay well inside free-tier rate limits
  const rows: Row[] = [];
  const started = new Date().toISOString();

  for (const q of QUESTIONS.slice(0, limit)) {
    const a = await ask(q, off); // first call also fills the NASA cache
    let b: Side | null = null;
    if (hasKeys) {
      b = await ask(q, cfg);
      await sleep(delay);
    }
    rows.push({ q, off: a, on: b });
    const tag = b?.r ? (b.r.generator === "llm" ? `AI(${b.r.provider})` : "AI→template") : "template only";
    console.log(`${q.id} ${tag} ${a.error ?? ""}`);
  }

  const models = [cfg.openrouter.models.length && cfg.openrouter.apiKey ? `OpenRouter: ${cfg.openrouter.models.join(", ")}` : "", cfg.groq.models.length && cfg.groq.apiKey ? `Groq: ${cfg.groq.models.join(", ")}` : ""]
    .filter(Boolean).join(" · ") || "none (dry run)";
  const dir = path.resolve(process.cwd(), "reports");
  mkdirSync(dir, { recursive: true });
  const stamp = started.slice(0, 16).replace(/[:T]/g, "-");
  const file = path.join(dir, `ai-comparison-${stamp}.html`);
  writeFileSync(file, report(rows, { started, aiRun: hasKeys, models }), "utf8");
  writeFileSync(file.replace(/\.html$/, ".json"), JSON.stringify(rows.map((x) => ({ q: x.q, off: { ms: x.off.ms, error: x.off.error, summaryParts: x.off.r?.summaryParts, generator: x.off.r?.generator }, on: x.on && { ms: x.on.ms, error: x.on.error, summaryParts: x.on.r?.summaryParts, generator: x.on.r?.generator, provider: x.on.r?.provider, model: x.on.r?.model, attempts: x.on.r?.attempts, verification: x.on.r?.verification } })), null, 2), "utf8");
  console.log(`\nReport: ${file}`);
});
