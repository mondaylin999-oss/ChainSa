// Runs inside the supplied prototype's closure, reusing its map and chart models.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  if (url === "/api/regions") return Ni({ regions: Tr, boundaries: Tg() });
  if (url === "/api/status") {
    const response = await nativeFetch("/api/earthlens-chat/status");
    const status = await response.json();
    return Ni({ database: false, firms: false, llm: Boolean(status.openrouter?.configured || status.groq?.configured), llmProvider: null });
  }
  if (url === "/api/analyze") {
    if (body.mode !== undefined && body.mode !== "live") return Ni({ error: "Only live NASA data is supported." }, 400);
    const parsed = iq.safeParse(body);
    if (!parsed.success) return Ni({ error: kg(parsed.error) }, 400);
    try {
      const { regionId, params, range } = parsed.data;
      const region = bo(regionId);
      const data = await sm(region, params, "live", range);
      return Ni(lm(region, params, data, crypto.randomUUID()));
    } catch {
      return Ni({ error: "Could not retrieve the data. Please try again." }, 502);
    }
  }
  if (url === "/api/chat") {
    if (body.mode !== undefined && body.mode !== "live") return Ni({ error: "Only live NASA data is supported." }, 400);
    const parsed = oq.safeParse(body);
    if (!parsed.success) return Ni({ error: kg(parsed.error) }, 400);
    const response = await nativeFetch("/api/earthlens-chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...parsed.data, history: parsed.data.history?.slice(-6).map(item => ({ ...item, content: item.content.slice(0, 2000) })) }),
    });
    const data = await response.json();
    if (!response.ok) return Ni(data, response.status);
    const metrics = data.facts.map(fact => ({ ...fact }));
    return Ni({ ...data, params: [], evidence: um(data.answer, metrics, {
      regionId: data.region.id, regionName: data.region.name, period: data.period,
      datasets: data.sources.map(source => source.name), mode: "live", extraLimitations: data.limitations,
    }) });
  }
  return nativeFetch(input, init);
};
