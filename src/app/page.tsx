"use client";

import { useEffect, useState } from "react";
import { ChatWidget, REGIONS, type Lang } from "@/features/earthlens-chat";

/**
 * Prototype host page only. In the real EarthLens site you render <ChatWidget /> inside the
 * existing page and pass the site's language and the region selected on the map.
 */
export default function Page() {
  const [lang, setLang] = useState<Lang>("en");
  const [regionId, setRegionId] = useState("ayeyarwady");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ocean-500 to-leaf-500 font-display font-bold text-white">E</div>
        <div>
          <h1 className="font-display text-xl font-semibold text-white">Myanmar EarthLens</h1>
          <p className="text-xs text-slate-400">AI chatbot prototype — open the chat button at the bottom right</p>
        </div>
      </div>

      <div className="card space-y-4 p-5 text-sm">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Site language (passed to the widget)</span>
          <div className="mt-2 flex gap-2">
            {(["en", "my"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-lg border px-3 py-1.5 ${lang === l ? "border-ocean-400/60 bg-ocean-500/20 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
                {l === "en" ? "English" : "မြန်မာ"}
              </button>
            ))}
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Selected region (simulates a map click)</span>
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-abyss-950/60 px-3 py-2 text-white">
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {lang === "my" ? r.nameMy : r.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          Status of configured providers: <a className="text-ocean-300 underline" href="/api/earthlens-chat/status">/api/earthlens-chat/status</a>
        </p>
      </div>

      <ChatWidget lang={lang} onLangChange={setLang} selectedRegionId={regionId} />
    </main>
  );
}
