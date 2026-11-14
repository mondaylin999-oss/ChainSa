import { getConfig } from "@/features/earthlens-chat/server/env";
import { fetchFires } from "@/features/earthlens-chat/server/nasa/firms";
import { getRegion } from "@/features/earthlens-chat/regions";
import { addDays, fetchPowerDaily } from "@/features/earthlens-chat/server/nasa/power";
import { getTownshipPoint } from "@/features/explorer/township-location";
import { DATASETS } from "@/features/explorer/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON.", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return error("Request body must be a JSON object.", 400);
  }

  const { topicId, regionId, datasetId, start, end, townshipId } = body as Record<string, unknown>;
  if (typeof topicId !== "string" || typeof regionId !== "string" || typeof datasetId !== "string" ||
      !isValidDate(start) || !isValidDate(end)) {
    return error("Choose a topic, regional reference point, dataset, and valid date range.", 400);
  }
  if (start > end) return error("Start date must be on or before the end date.", 400);

  const dataset = DATASETS.find((item) => item.id === datasetId && item.topicId === topicId);
  if (!dataset) return error("That dataset is not available for the selected topic.", 400);
  const region = getRegion(regionId);
  if (!region) return error("Choose a valid regional reference point.", 400);

  if (townshipId !== undefined && typeof townshipId !== "string") return error("Choose a valid township.", 400);
  const township = townshipId ? getTownshipPoint(townshipId, region.id) : undefined;
  if (townshipId && !township) return error("That township does not belong to the selected region.", 400);
  const location = { ...(township ?? region), type: township ? "township" : "region" };

  const days = Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  if (start < "1981-01-01") {
    return error("Choose a date range from 1981-01-01 onward.", 400);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (end > today) return error("Future observation dates are not available.", 400);

  const config = getConfig();
  if (dataset.id === "fire-detections") {
    if (township) return error("Township fire detections are not connected. Select all townships to view regional fire data.", 503);
    if (!config.firmsMapKey) return error("NASA FIRMS is unavailable. Configure FIRMS_MAP_KEY on the server.", 503);
    if (days > 10 || end !== today) return error("NASA FIRMS supports only the most recent 10 days ending today. Select an available recent date range.", 400);
    try {
      const { detections } = await fetchFires(region, days, config.firmsMapKey, config.nasaTimeoutMs);
      const byDate = new Map<string, number>();
      for (const detection of detections) byDate.set(detection.date, (byDate.get(detection.date) ?? 0) + 1);
      const observations = Array.from({ length: days }, (_, offset) => {
        const date = addDays(start, offset);
        return { date, value: byDate.get(date) ?? 0 };
      });
      return Response.json({
        observations,
        summary: summarize(observations.map((observation) => observation.value)),
        dataset,
        region: { id: region.id, name: region.name, nameMy: region.nameMy, lat: region.lat, lon: region.lon },
        location,
        period: { start, end },
        source: dataset.source,
        geographicCoverage: "Detections inside the state/region boundary; representative-point fallback where no boundary is bundled.",
        observedAt: new Date().toISOString(),
        missingCount: 0,
      }, { headers: { "cache-control": "no-store" } });
    } catch (cause) {
      console.error("[explore] NASA FIRMS request failed:", cause);
      return error("NASA FIRMS could not return observations. Please try again later.", 502);
    }
  }

  if (!dataset.parameter) return error("This dataset is not connected to a live observation service.", 503);
  try {
    const result = await fetchPowerDaily(
      location.lat,
      location.lon,
      [dataset.parameter],
      start,
      end,
      config.nasaTimeoutMs,
      fetch,
      config.powerBaseUrl,
    );
    const returnedObservations = result.series[dataset.parameter] ?? [];
    const valuesByDate = new Map(returnedObservations.map((observation) => [observation.date, observation.value]));
    const observations = Array.from({ length: days }, (_, offset) => {
      const date = addDays(start, offset);
      return { date, value: valuesByDate.get(date) ?? null };
    });
    const values = observations.map((observation) => observation.value);
    return Response.json({
      observations,
      summary: summarize(values),
      dataset: { ...dataset, unit: result.units[dataset.parameter] || dataset.unit },
      region: { id: region.id, name: region.name, nameMy: region.nameMy, lat: region.lat, lon: region.lon },
      location,
      period: { start, end },
      source: dataset.source,
      geographicCoverage: township ? "One NASA POWER grid point at a representative point inside the selected township boundary; not a township-wide average or local sensor measurement." : "One NASA POWER grid point at the regional reference coordinates; not a state/region-wide or township-wide average.",
      observedAt: new Date().toISOString(),
      missingCount: values.filter((value) => value === null).length,
    }, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    console.error("[explore] NASA POWER request failed:", cause);
    return error("NASA POWER could not return observations. Please try again later.", 502);
  }
}

function summarize(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return {
    count: valid.length,
    mean: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null,
    min: valid.length ? Math.min(...valid) : null,
    max: valid.length ? Math.max(...valid) : null,
    latest: valid.length ? valid[valid.length - 1] : null,
  };
}
