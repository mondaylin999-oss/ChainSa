// OFFLINE TEST SERVER — fakes NASA POWER and the OpenRouter/Groq chat API on http://localhost:4010.
// It lets you test the whole chat flow without internet or API keys. Its numbers are synthetic,
// NOT NASA observations. Never point production at it.
//
//   node scripts/mock-providers.mjs            (both AI providers answer)
//   MOCK_OPENROUTER=429 node scripts/mock-providers.mjs   (OpenRouter "free limit reached" -> Groq backup)
//   MOCK_OPENROUTER=429 MOCK_GROQ=429 node scripts/mock-providers.mjs   (both fail -> template answer)
//   MOCK_OPENROUTER=invent node scripts/mock-providers.mjs  (OpenRouter invents a number -> rejected)
//   MOCK_OPENROUTER=forecast node scripts/mock-providers.mjs (OpenRouter invents a probability -> rejected)
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);

function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

// Synthetic daily values with a monsoon-like season (May–Oct wet). NOT NASA observations.
function powerResponse(url) {
  const q = new URL(url, "http://x").searchParams;
  const codes = (q.get("parameters") ?? "").split(",");
  const toIso = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const start = toIso(q.get("start")), end = toIso(q.get("end"));
  const cutoff = new Date(`${end}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 2); // pretend the newest 2 days are not published yet
  const param = Object.fromEntries(codes.map((c) => [c, {}]));
  for (let d = new Date(`${start}T00:00:00Z`); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ds = d.toISOString().slice(0, 10), k = ds.replaceAll("-", "");
    const m = d.getUTCMonth() + 1, wet = m >= 5 && m <= 10, r = hash01(ds);
    const val = {
      PRECTOTCORR: wet ? (r < 0.3 ? 0 : r * 30) : r < 0.85 ? 0 : r * 8,
      T2M: wet ? 27 + r * 2 : 24 + r * 3, T2M_MAX: wet ? 31 + r * 3 : 30 + r * 4, T2M_MIN: wet ? 23 + r : 18 + r * 2,
      RH2M: wet ? 85 + r * 8 : 65 + r * 10, WS10M: 2 + r * 2, WS10M_MAX: 4 + r * 4, GWETROOT: wet ? 0.75 + r * 0.15 : 0.55 + r * 0.15,
    };
    for (const c of codes) param[c][k] = d > cutoff ? -999 : Math.round((val[c] ?? 0) * 100) / 100;
  }
  return { header: { fill_value: -999 }, parameters: { PRECTOTCORR: { units: "mm/day" }, T2M: { units: "C" }, T2M_MAX: { units: "C" }, T2M_MIN: { units: "C" }, RH2M: { units: "%" }, WS10M: { units: "m/s" }, WS10M_MAX: { units: "m/s" }, GWETROOT: { units: "1" } }, properties: { parameter: param } };
}

// Writes a "Potential Impacts" text that only reuses numbers from the FACT lines in the prompt.
function chatAnswer(body, provider) {
  const sys = body.messages.find((m) => m.role === "system")?.content ?? "";
  const fact = (id) => new RegExp(`^- \\[${id}\\] .*: ([\\d.]+) (\\S+)`, "m").exec(sys);
  const my = sys.includes("Reply in Myanmar");
  const p50 = fact("hist_rain_p50"), soil = fact("soil_pct");
  const lines = [];
  if (my) {
    lines.push(`• [${provider} mock] ယခင်နှစ်များတွင် ဤရက် ၃၀ အတွင်း ပုံမှန် မိုးရေချိန် ${p50 ? p50[1] : "?"} mm ခန့် ရှိခဲ့သည်။`);
    if (soil) lines.push(`• မြေဆီလွှာ စိုစွတ်မှု အဆင့်သည် ${soil[1]} ဖြစ်ပြီး ရေလိုအပ်ချက်ကို စောင့်ကြည့်ရန် လိုပါသည်။`);
  } else {
    lines.push(`• [${provider} mock] In past years these 30 days typically brought about ${p50 ? p50[1] : "?"} mm of rain at this point.`);
    if (soil) lines.push(`• Root-zone soil wetness ranks at the ${soil[1]}th percentile, which affects water available to crops.`);
  }
  return lines.join("\n");
}

const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const send = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (req.url.startsWith("/api/temporal/daily/point")) return send(200, powerResponse(req.url));
  for (const [prefix, provider, mode] of [["/openrouter/", "openrouter", process.env.MOCK_OPENROUTER], ["/groq/", "groq", process.env.MOCK_GROQ]]) {
    if (!req.url.startsWith(prefix)) continue;
    if (!String(req.headers.authorization ?? "").startsWith("Bearer ")) return send(401, { error: "no key" });
    if (mode === "429") return send(429, { error: { message: "Rate limit exceeded: free-models-per-day" } });
    const body = JSON.parse(raw);
    const text = mode === "invent" ? "• Rainfall was 999.9 mm." : mode === "forecast" ? "• There is a 70% chance of drought next month." : chatAnswer(body, provider);
    return send(200, { model: body.model === "openrouter/free" ? "mock/free-model:free" : body.model, choices: [{ message: { role: "assistant", content: text } }] });
  }
  send(404, { error: "not found" });
});
server.listen(PORT, () => console.log(`Mock NASA POWER + AI providers on http://localhost:${PORT} (synthetic data)`));
