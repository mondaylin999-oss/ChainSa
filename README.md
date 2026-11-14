# Myanmar EarthLens — AI Chatbot module (prototype)

A bilingual (Myanmar / English) chatbot that answers questions with **real NASA data**.
It is built as one self-contained feature folder, so you can copy it into the original
Myanmar EarthLens Next.js project.

- **Frontend:** a React chat widget that copies the EarthLens demo's design (colours, fonts, panel, bubbles)
- **Backend:** a Next.js Route Handler at `POST /api/earthlens-chat` (Node.js runtime)
- **NASA data:** NASA POWER daily (rainfall, temperature, humidity, wind, root-zone soil wetness) and NASA FIRMS VIIRS fires (only when `FIRMS_MAP_KEY` is set)
- **AI providers:** OpenRouter **free** models first, then Groq **free-plan** models, then a template answer. There is no paid fallback.

> **Status — please read.** Every test so far ran in a cloud sandbox **with no internet access to NASA,
> OpenRouter or Groq**. The full flow was tested with automated tests and a local mock server
> (`scripts/mock-providers.mjs`). **Real NASA POWER/FIRMS calls and real OpenRouter/Groq calls have
> not been tested yet.** Run the checks in "Test with real data" below on your computer.

---

## 0. What's new: 30-day drought / flood / agriculture decision support (Phase 1)

Every answer now has the same six sections in English and Myanmar:
**1 Current Conditions · 2 30-Day Future Outlook · 3 Potential Impacts · 4 Decision Support · 5 Data Sources · 6 Important Disclaimer.**

- **Sections 1, 2, 4, 5 and 6 are built by the server**; the AI writes only section 3, so it cannot present history as a forecast, invent probabilities or add sources.
- **No forecast yet.** Section 2 says a reliable 30-day forecast cannot be calculated yet. It then shows a **historical pattern**
  (what happened on the same calendar dates in 1981–last year, from NASA POWER), clearly marked "NOT a forecast".
  The validation plan for adding a real forecast is in `docs/FORECAST_VALIDATION_PLAN.md`.
- **Current conditions** compare the last 30/90 days of rain, soil wetness and recent heat with the same dates in past years (percentiles).
- **EarthLens indicators** (rule-based, not official declarations):
  - Drought **warning**: soil-wetness percentile < 10, or soil wetness < 20 and 90-day rainfall < 20. **Watch**: any of 30-day rain, 90-day rain or soil wetness < 20.
  - Wet / flood-from-rain **watch**: 30-day rain > 90 and soil wetness > 80, or a day in the last 7 above the wettest-1%-of-days threshold. River levels are not included.
  - Heat **unusual**: hottest day of the last 7 days > 90th percentile for the season.
  - In the normal dry season (median 30-day rain < 10 mm) rainfall percentiles are skipped because they are not meaningful.
- **Decision support** comes from fixed rules, each with its reason and uncertainty. It's marked "pending review by agricultural experts".
- The required disclaimers are printed exactly. While no model is used, a one-line note says so.
- AI text that contains probability or forecast wording ("70% chance", "will rain") is rejected, just like invented numbers.

## 1. How a chat request flows

```
Browser (ChatWidget)  ──POST /api/earthlens-chat──►  Route Handler (server only)
                                                     1. check the request (zod) + rate limit
                                                     2. detect language, region and data types
                                                     3. fetch NASA POWER: last ~30 days (all variables) + 1981→today
                                                        (rain, soil wetness, max temperature) → facts, percentiles,
                                                        historical pattern, indicators, rule-based recommendations
                                                     4. AI writes section 3 only: OpenRouter free → Groq free
                                                     5. reject AI text with numbers not in the facts or forecast wording
                                                     6. nothing works → template text for section 3
                                                     7. server assembles the six sections
```

- The AI is **never called without NASA data**. If NASA is down, the user gets an honest "couldn't retrieve data" message.
- Sources, observation dates and units are written by the server (sections 1, 2 and 5), not the AI.
- AI answers containing numbers or dates that are not in the NASA facts are **discarded** (`CHAT_VERIFY_MODE=strict`).

## 2. Folder structure

```
src/
  app/
    api/earthlens-chat/route.ts          POST endpoint (3 lines — calls the feature's handler)
    api/earthlens-chat/status/route.ts   GET: which providers are configured (never shows keys)
    page.tsx, layout.tsx, globals.css    prototype host page only (not needed in the real site)
  features/earthlens-chat/               ← COPY THIS FOLDER INTO THE REAL PROJECT
    index.ts                             browser-safe exports (ChatWidget, types, regions)
    types.ts  regions.ts  params.ts  i18n.ts
    config/answer-format.ts              ← YOUR ANSWER TEMPLATE (six headings, disclaimers, word limit…)
    components/ChatWidget.tsx            floating button + chat panel (EarthLens styling)
    client/useEarthLensChat.ts           browser state; talks only to /api/earthlens-chat
    server/                              server-only (import "server-only" blocks browser use)
      env.ts            reads env vars; refuses non-free models
      handler.ts        request validation, rate limiting, orchestration
      validation.ts     zod schema, size limits
      rate-limit.ts     in-memory sliding window
      grounding.ts      recent NASA data → facts
      climate/          1981–present comparison: percentiles, historical pattern, indicators
      recommendations.ts  rule-based decision support (reason + uncertainty)
      answer-builder.ts   assembles the six sections
      forecast/validated-outlook.ts  Phase 3 hook for validated probabilities (returns null today)
      nasa/power.ts     NASA POWER client
      nasa/firms.ts     NASA FIRMS client + region polygons
      nasa/myanmar-admin1.json  state/region boundaries (Natural Earth, public domain, from the demo)
      providers/        OpenRouter + Groq (OpenAI-compatible) and the fallback chain
      prompt.ts         AI instructions built from the answer format
      verify.ts         number/date checker (handles Myanmar digits ၀-၉)
      cache.ts          in-memory cache for NASA responses
scripts/
  mock-providers.mjs    offline mock of NASA POWER + AI providers (synthetic numbers)
  check-secrets.mjs     scans the browser build for leaked keys
tests/                  38 unit/integration tests (vitest, mocked network)
docs/FORECAST_VALIDATION_PLAN.md   datasets, probability method and validation gate for Phase 2
```

## 3. Run locally on Windows

Requirements: **Node.js 20.9 or newer** (22 LTS recommended) — https://nodejs.org

In **PowerShell**, from the project folder:

```powershell
npm install
Copy-Item .env.example .env.local
notepad .env.local          # paste your keys (see section 4)
npm run dev
```

Open http://localhost:3000 and click the round chat button in the bottom-right corner.

Other commands:

```powershell
npm test                    # 38 automated tests (no internet needed)
npm run typecheck
npm run build               # production build
npm run check:secrets       # after build: confirms no key is in browser files
```

## 4. Environment variables (`.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | for AI | Primary provider. Free key: https://openrouter.ai/keys |
| `OPENROUTER_MODELS` | no | Comma list, tried in order. Only `openrouter/free` or IDs ending in `:free` are accepted. Default `openrouter/free` |
| `GROQ_API_KEY` | for backup AI | Backup provider. Free key: https://console.groq.com/keys (keep the account on the Free plan) |
| `GROQ_MODELS` | no | Default `openai/gpt-oss-20b,openai/gpt-oss-120b`. Only allow-listed free models are accepted |
| `GROQ_EXTRA_FREE_MODELS` | no | Add a new Groq free model to the allowlist yourself |
| `FIRMS_MAP_KEY` | for fires | Free NASA FIRMS key: https://firms.modaps.eosdis.nasa.gov/api/map_key/ |
| `CHAT_RATE_LIMIT_MAX` / `CHAT_RATE_LIMIT_WINDOW_SECONDS` | no | Default 10 requests per 60 s |
| `TRUST_PROXY` | no | `true` only behind a trusted proxy (e.g. Vercel), so each user gets their own limit |
| `CHAT_ALLOWED_ORIGINS` | no | e.g. `https://your-site.org`; blocks other websites from calling the API |
| `CHAT_VERIFY_MODE` | no | `strict` (default) discards AI answers with unverified numbers; `warn` keeps and logs them |
| `AI_TIMEOUT_MS`, `NASA_TIMEOUT_MS` | no | Request timeouts |
| `OPENROUTER_BASE_URL`, `GROQ_BASE_URL`, `NASA_POWER_BASE_URL` | testing only | Point at the mock server; leave empty in real use |

Without any AI key the chatbot still works and answers with the template. NASA POWER needs no key.

**Never** prefix these with `NEXT_PUBLIC_`, and never commit `.env.local` (it is already in `.gitignore`).

### Staying free

- OpenRouter: free models are limited to roughly 50 requests/day on accounts that never bought credits
  (more after a one-time top-up). When the limit is hit, OpenRouter answers HTTP 429 and the bot moves to Groq.
  A 402 (payment required) also makes the bot stop using OpenRouter for that request. Don't add credits if you want to stay at $0.
- Groq: its API doesn't say whether a model is free, so the server only uses an allowlist. Free use depends on your
  **account plan** — don't add billing. A third-party source reports that Groq made its Llama models Enterprise-only
  in August 2026, so the defaults are `openai/gpt-oss-*`.
- Free model lists change often. Check https://openrouter.ai/models?max_price=0 and https://console.groq.com/docs/rate-limits.

## 5. Test English and Myanmar responses

### In the browser
1. `npm run dev`, then open http://localhost:3000.
2. Click the chat button. Try a suggested question or type one:
   - English: `Is there a drought risk for rice farmers in Magway in the next 30 days?`
   - Myanmar: `ဧရာဝတီတိုင်းဒေသကြီးတွင် လာမည့် တစ်လအတွင်း ရေကြီးနိုင်ခြေ မည်သို့ရှိပါသလဲ။`
   - Check: the six numbered sections appear in the same order in both languages, section 2 says no forecast is
     available, the historical block says "NOT a forecast" / "ခန့်မှန်းချက် မဟုတ်ပါ", and section 6 has the exact disclaimer.
3. Switch EN / မြန်မာ in the page. The UI changes, and the **answer language follows the question's script**.
4. Under each answer, check the line showing the region, the dates, "AI-written (model)" or "template", and the
   "numbers checked against NASA data" badge.

### From PowerShell (Myanmar text must be sent as UTF-8)

```powershell
$body = @{ message = "ရန်ကုန်မှာ မကြာသေးမီက မိုးရေချိန် ဘယ်လောက်ရှိလဲ" } | ConvertTo-Json
$r = Invoke-RestMethod -Uri http://localhost:3000/api/earthlens-chat -Method Post `
     -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body))
$r.answer; $r.generator; $r.provider; $r.model; $r.attempts
```

Check what is configured: http://localhost:3000/api/earthlens-chat/status

### Test with real data (not yet done — please run this)
1. Put real keys in `.env.local` and leave the three `*_BASE_URL` lines empty.
2. Ask: `rain in Yangon`. Expected: `nasaDataAvailable: true`, a `period` a few days before today,
   and `generator: "llm"` with `provider: "openrouter"`.
3. Compare one value with NASA POWER yourself: https://power.larc.nasa.gov/data-access-viewer/ (point 17.11, 96.11; daily; PRECTOTCORR).
4. Temporarily set `OPENROUTER_API_KEY=` (empty) and ask again. Expected: `provider: "groq"`.
5. Empty both keys. Expected: `generator: "template"`.
6. Burmese quality from free models varies a lot — read the Myanmar answers carefully.

### Offline test with the mock server (no internet, synthetic numbers)

```powershell
# terminal 1
node scripts/mock-providers.mjs
# terminal 2 — in .env.local set:
#   OPENROUTER_API_KEY=test   GROQ_API_KEY=test
#   OPENROUTER_BASE_URL=http://localhost:4010/openrouter
#   GROQ_BASE_URL=http://localhost:4010/groq
#   NASA_POWER_BASE_URL=http://localhost:4010/api/temporal
npm run dev
```
Simulate failures by restarting the mock with `$env:MOCK_OPENROUTER="429"` (falls back to Groq), `"invent"` (made-up number gets rejected),
or `$env:MOCK_OPENROUTER="429"; $env:MOCK_GROQ="429"` (template answer). **Clear the base-URL lines afterwards.**

## 6. Change the answer format

Edit `src/features/earthlens-chat/config/answer-format.ts`:

- `sections` — the six headings (English + Myanmar); `numberHeadings` adds "1." … "6."
- `disclaimer` — the exact required texts (English and Myanmar); `noModelNote` — shown while no forecast model is used
- `decisionSupportStatus` — the "pending expert review" line (set to `null` after review)
- `aiMaxWords`, `extraRules` — limits and extra rules for the AI-written section 3
- `showUnits`, `showDates`, `showSourceLinks`

## 7. Integrate into the original EarthLens project (tomorrow)

The original demo looks like a Next.js app (it uses `next/dynamic`-style code), React 19, Tailwind 3 and lucide icons, so this module fits as-is.

1. **Copy files**
   - `src/features/earthlens-chat/` → into the original project (e.g. `src/features/earthlens-chat/`)
   - `src/app/api/earthlens-chat/` → into its `app/api/` folder
   - `scripts/` (optional) and the `.env.example` entries
   - If the original project has no `@/` alias pointing to `src/`, change the import in the two `route.ts` files to a relative path.
2. **Dependencies:** `npm install zod server-only lucide-react` (skip any already installed; the code works with zod 3 or 4).
3. **Tailwind:** make sure `content` includes the feature folder. The colours `ocean/leaf/ember/abyss` and the
   `pulsering` animation already exist in the original. Optionally add `fontFamily.mm` (see `tailwind.config.ts`).
4. **Pick one UI option:**
   - **A — new widget:** replace the existing chat panel with
     `<ChatWidget lang={lang} selectedRegionId={selectedRegionId} />` (import from `@/features/earthlens-chat`).
   - **B — keep the existing panel:** change its `fetch("/api/chat", …)` to `fetch("/api/earthlens-chat", …)`.
     The new endpoint accepts the same request (`message, sessionId, selectedRegionId, mode, history`) and returns
     `answer, region, period, sources, generator, mode`. It has no `evidence` field, so the old evidence widget is
     simply hidden.
5. Add the keys to `.env.local` **on the server only**.
6. Leave the old `/api/chat` in place until the new one is tested, then remove it.
7. Don't put this endpoint into the static HTML demo/artifact build — it needs a running Next.js server.

## 8. Security summary

- Keys are read only in `server/env.ts`, which is marked `server-only`; importing it from browser code fails the build.
- `npm run check:secrets` was run against a build that had fake keys in `.env.local`: no key appeared in browser files.
- Requests are checked: JSON only, ≤ 32 KB body, message 1–1000 characters, known region IDs, ≤ 20 history items, no unknown fields.
- Rate limit: in-memory per server instance. On multi-instance or serverless hosting, replace it with a shared store (e.g. Upstash Redis).
- Chat history comes from the browser, so only the last 6 turns are sent to the AI, and any numbers the AI copies from them still have to pass the NASA check.

## 9. Known limitations

- Each region is represented by one NASA POWER grid point (same as the demo).
- POWER's newest days are often not published yet, so the bot uses the 7 most recent **complete** days.
- The number checker can't judge reasoning, only numbers and dates. Small integers that are also calendar days in the
  observation window are accepted.
- New Myanmar UI and template text was written for this prototype — **please have a native speaker review it**
  (text reused from the demo is marked in `i18n.ts`).
- No 30-day forecast yet (see `docs/FORECAST_VALIDATION_PLAN.md`). Historical patterns are not forecasts.
- The first question for each region loads the NASA POWER record from 1981 (one larger request, then cached for 6 hours).
  **Its real response time has not been measured** — test it on your computer.
- Not yet integrated: GloFAS river forecasts, SMAP / IMERG satellite data, streaming replies.
- Decision-support rules and the new Myanmar wording need review by agricultural experts and a native speaker.
