import { getConfig } from "@/features/earthlens-chat/server/env";
import { fetchPublicFires } from "@/features/explorer/server/public-fires";
import { getRegion } from "@/features/earthlens-chat/regions";
import { addDays, fetchPowerDaily } from "@/features/earthlens-chat/server/nasa/power";
import { getTownshipPoint } from "@/features/explorer/township-location";
import { DATASETS } from "@/features/explorer/catalog";
import { fetchNdviRange } from "@/features/earthlens-chat/server/nasa/modis-ndvi";
import { earthEngineConfigured, fetchBlackMarbleMonthly, fetchSatelliteObservations } from "@/features/explorer/server/earth-engine";
import { EARTH_ENGINE_SETUP_MESSAGE } from "@/features/explorer/satellite-products";
import { PUBLIC_MODIS_DATASETS, fetchLandCoverClasses, fetchPublicModis, subsetWindow, windowCoverageText } from "@/features/explorer/server/modis-products";
import { SATELLITE_PRODUCTS } from "@/features/explorer/satellite-products";
import { areaAverageBasis, areaTotalBasis, bufferBasis, gridCellBasis, pointBasis, pointLabel, reachBasis, windowBasis } from "@/features/explorer/spatial-basis";
import { PACE_AOD_START, fetchPaceAod } from "@/features/explorer/server/pace-aod";
import { SWOT_DATASETS, SWOT_START, fetchReachSeries, findNearestReach, swotObservations } from "@/features/explorer/server/swot";
import { WATER_WINDOW, excessWaterKm2, fetchDrySeason, fetchWaterComposites, referenceWater, waterAreaKm2, waterPersistence } from "@/features/explorer/server/modis-water";
import { CLIMATE_PARAMETERS, ClimatePeriodError, fetchClimateIndicator, type ClimateIndicatorId } from "@/features/explorer/server/climate-indicators";
import { POWER_BREAK_NOTE, crossesPowerBreak } from "@/features/earthlens-chat/server/nasa/power-homogeneity";

export const runtime = "nodejs";
// Public NASA ORNL subsets take 30–60 s per request and urban indicators need several in sequence.
export const maxDuration = 300;
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
  const location = { ...(township ?? region), type: (township ? "township" : "region") as "township" | "region" };

  const days = Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  if (start < "1981-01-01") {
    return error("Choose a date range from 1981-01-01 onward.", 400);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (end > today) return error("Future observation dates are not available.", 400);
  const regionInfo = { id: region.id, name: region.name, nameMy: region.nameMy, lat: region.lat, lon: region.lon };
  const pointNote = township ? "One NASA POWER grid point at a representative point inside the selected township boundary; not a township-wide average or local sensor measurement." : "One NASA POWER grid point at the regional reference coordinates; not a state/region-wide or township-wide average.";
  const point = pointBasis(location);

  if (dataset.id in CLIMATE_PARAMETERS) {
    try {
      const { observations, method } = await fetchClimateIndicator(dataset.id as ClimateIndicatorId, location.lat, location.lon, start, end, fetch, getConfig().powerBaseUrl);
      return Response.json({
        observations, summary: summarize(observations.map(d => d.value)), dataset, region: regionInfo, location, spatialBasis: point,
        period: { start, end }, source: dataset.source,
        geographicCoverage: `${pointNote} Method: ${method} Each value is dated to the first day of its calendar month (UTC days).`,
        observedAt: new Date().toISOString(), missingCount: observations.filter(d => d.value === null).length,
      }, { headers: { "cache-control": "no-store" } });
    } catch (cause) {
      if (cause instanceof ClimatePeriodError) return error(cause.message, 400);
      console.error("[explore] NASA POWER climate indicator failed:", cause);
      return error("NASA POWER could not return the daily record needed for this indicator. Please try again later; no values have been substituted.", 502);
    }
  }
  if (dataset.id === "land-cover") {
    try {
      const { years, dominant } = await fetchLandCoverClasses(location.lat, location.lon, start, end);
      const latest = [...years].reverse().find(y => Object.keys(y.classShares).length);
      const breakdown = latest ? Object.entries(latest.classShares).map(([name, share]) => `${name} ${share}%`).join(", ") : "";
      return Response.json({
        observations: years, summary: summarize(years.map(d => d.value)), dataset: { ...dataset, label: dominant ? `${dominant} share` : dataset.label },
        region: regionInfo, location, spatialBasis: windowBasis(location, subsetWindow(500)), period: { start, end }, source: dataset.source,
        geographicCoverage: `${windowCoverageText("land-cover", Boolean(township))} ${dominant ? `Values show the share of "${dominant}", the most common class over the selected years.` : "No valid land-cover pixels were returned."}${latest ? ` ${latest.date.slice(0, 4)} breakdown: ${breakdown}.` : ""}`,
        observedAt: new Date().toISOString(), missingCount: years.filter(d => d.value === null).length,
      }, { headers: { "cache-control": "no-store" } });
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "NASA land-cover data could not be retrieved. Please try again.", 502);
    }
  }

  const ok = (body: Record<string, unknown>) => Response.json({
    region: regionInfo, location, period: { start, end }, observedAt: new Date().toISOString(), ...body,
    summary: summarize((body.observations as { value: number | null }[]).map(d => d.value)),
    missingCount: (body.observations as { value: number | null }[]).filter(d => d.value === null).length,
  }, { headers: { "cache-control": "no-store" } });
  const providerError = (cause: unknown, fallback: string) => error(cause instanceof Error ? cause.message : fallback, 502);

  if (dataset.id === "aerosol-optical-depth") {
    if (end < PACE_AOD_START) return error(`NASA PACE OCI aerosol data begin on ${PACE_AOD_START}. Choose a later period.`, 400);
    if (days > 731) return error("Choose up to two years for aerosol charts.", 400);
    try {
      const observations = await fetchPaceAod(location.lat, location.lon, start < PACE_AOD_START ? PACE_AOD_START : start, end);
      return ok({ observations, dataset, source: dataset.source, spatialBasis: gridCellBasis(location, 0.1),
        geographicCoverage: `Value of the 0.1° (about 11 km) PACE OCI grid cell containing the ${township ? "township representative point" : "regional reference point"}; not a township or region-wide average. Each value is an 8-day composite dated to its first day. Cells without a quality-screened retrieval (usually cloud) are left blank, not zero. AOD is a column haze measure, not ground-level PM2.5.` });
    } catch (cause) { return providerError(cause, "NASA PACE aerosol data could not be retrieved."); }
  }

  if (dataset.id in SWOT_DATASETS) {
    const spec = SWOT_DATASETS[dataset.id];
    if (end < SWOT_START) return error(`NASA SWOT science observations begin on ${SWOT_START}. Choose a later period.`, 400);
    if (days > 1100) return error("Choose up to three years for SWOT charts.", 400);
    try {
      const lake = spec.reachType === "lake-on-river";
      const reach = await findNearestReach(location.lat, location.lon, spec.reachType);
      if (!reach) return error(`No SWOT ${lake ? "lake-on-river (reservoir) reach" : "river reach"} from the SWOT River Database lies within about 16 km of this ${township ? "township representative point" : "regional reference point"}, so there is insufficient data. Choose a township on a large river${lake ? " or reservoir" : ""}.`, 404);
      const rows = await fetchReachSeries(reach.reachId, start < SWOT_START ? SWOT_START : start, end);
      const { observations, excluded, passes } = swotObservations(rows, dataset.id);
      const valid = observations.filter(o => o.value !== null).length;
      const discharge = dataset.id === "river-discharge" && passes > 0 && valid === 0 ? " SWOT has not computed a valid discharge estimate for this reach in this product version, so no discharge values are available." : "";
      return ok({ observations: observations.map(({ date, value }) => ({ date, value })), dataset: { ...dataset, unit: spec.unit }, source: dataset.source,
        spatialBasis: reachBasis(location, reach, lake), swotReach: reach,
        geographicCoverage: `SWOT reach ${reach.reachId}${reach.riverName ? ` on the ${reach.riverName}` : ""} (SWORD reach type: ${lake ? "lake on river" : "river"}), the nearest within about 16 km (${reach.distanceKm} km from the selected point). A reach is a river segment of roughly 10 km; values describe that segment, not the township or region. ${passes} satellite passes in this period; ${excluded} excluded or without a valid value by the quality rule (reach quality 3, partial coverage or ice). Passes on the same UTC day are averaged; dates are UTC.${discharge}` });
    } catch (cause) { return providerError(cause, "NASA SWOT observations could not be retrieved."); }
  }

  if (dataset.id === "surface-water-area" || dataset.id === "flood-extent") {
    try {
      const { composites } = await fetchWaterComposites(location.lat, location.lon, start, end);
      const windowText = `Calculated from a ${WATER_WINDOW.n} × ${WATER_WINDOW.n} window of 463 m NASA MODIS pixels (${WATER_WINDOW.pixels} pixels, about ${WATER_WINDOW.sideKm} km × ${WATER_WINDOW.sideKm} km ≈ ${WATER_WINDOW.areaKm2} km²) around the ${township ? "township representative point" : "regional reference point"}; this is a window-based sample, not a township or region total. Composites with less than 80% clear sky are left blank, never shown as 0 km².`;
      const basis = windowBasis(location, WATER_WINDOW);
      if (dataset.id === "surface-water-area") {
        const persistence = waterPersistence(composites);
        return ok({ observations: composites.map(c => ({ date: c.date, value: waterAreaKm2(c) })), dataset, source: dataset.source, spatialBasis: basis,
          geographicCoverage: `${windowText} Across the selected period, pixels with at least 3 clear looks: persistent water (water in ≥90% of clear looks) ${persistence.persistentKm2} km², seasonal or temporary water ${persistence.seasonalKm2} km² (${persistence.observedPixels} of ${persistence.pixels} pixels had enough clear looks).` });
      }
      const years = [...new Set(composites.map(c => Number(c.date.slice(0, 4))))];
      const references = new Map<number, (0 | 1 | null)[]>();
      for (const year of years) references.set(year, referenceWater(await fetchDrySeason(location.lat, location.lon, year)));
      const observations = composites.map(c => ({ date: c.date, value: excessWaterKm2(c, references.get(Number(c.date.slice(0, 4))) ?? []) }));
      return ok({ observations, dataset, source: dataset.source, spatialBasis: basis,
        geographicCoverage: `${windowText} Values are water detected in that composite outside the same year's January–April reference water. This is possible flooding, not a confirmed or official flood extent.` });
    } catch (cause) { return providerError(cause, "NASA MODIS surface-reflectance data could not be retrieved."); }
  }

  const config = getConfig();
  if (dataset.engine === "earth-engine") {
    if (!earthEngineConfigured() && !PUBLIC_MODIS_DATASETS.has(dataset.id)) return error(EARTH_ENGINE_SETUP_MESSAGE, 503);
    // Ongoing NASA archives: only the start is enforced; NASA's published date list decides what exists after it.
    if (dataset.coverage && (end < dataset.coverage.start || (!dataset.coverage.ongoing && start > dataset.coverage.end))) {
      return error(dataset.coverage.ongoing ? `Choose dates from ${dataset.coverage.start} onward for this satellite archive.` : `Choose dates between ${dataset.coverage.start} and ${dataset.coverage.end} for this published satellite archive.`, 400);
    }
    try {
      const polygon = earthEngineConfigured();
      const blackMarble = dataset.id === "nighttime-lights" || dataset.id === "lit-area";
      const result = blackMarble ? await fetchBlackMarbleMonthly(dataset.id === "lit-area" ? "lit-area" : "radiance", region, townshipId as string | undefined, start, end)
        : polygon ? await fetchSatelliteObservations(dataset.id, region, townshipId as string | undefined, start, end) : {
        observations: await fetchPublicModis(dataset.id, location.lat, location.lon, start, end),
        geographicCoverage: windowCoverageText(dataset.id, Boolean(township)),
        spatialSelection: "pixel-window" as const, qaPolicy: dataset.limitations,
      };
      // Earth Engine falls back to a 10 km buffer only where no region boundary is bundled.
      const spatialBasis = !polygon ? windowBasis(location, subsetWindow(SATELLITE_PRODUCTS[dataset.id]?.scale ?? 500))
        : result.spatialSelection === "polygon-mean" ? (dataset.id === "lit-area" ? areaTotalBasis(Boolean(township), "lit area") : areaAverageBasis(Boolean(township))) : bufferBasis({ ...region, type: "region" }, 10);
      const actualDataset = polygon ? dataset : { ...dataset, engine: undefined, source: { name: `${dataset.source.name.split(" via ")[0]} via NASA ORNL DAAC point subsets`, url: "https://modis.ornl.gov/data/modis_webservice.html" } };
      return Response.json({ ...result, summary: summarize(result.observations.map(d => d.value)), dataset: actualDataset,
        region: regionInfo, location, spatialBasis,
        period: { start, end }, source: actualDataset.source, observedAt: new Date().toISOString(),
        missingCount: result.observations.filter(d => d.value === null).length,
      }, { headers: { "cache-control": "no-store" } });
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "Satellite observations could not be retrieved. Please try again.", 502);
    }
  }
  if (dataset.id === "fire-detections") {
    if (days > 7 || start < addDays(today, -6)) return error("The public fire feed covers the most recent seven days. Choose dates within that period.", 400);
    try {
      const { detections, coverage, latestFeedDate, boundary } = await fetchPublicFires(region, townshipId as string | undefined);
      const byDate = new Map<string, number>();
      for (const detection of detections) if (detection.date >= start && detection.date <= end) byDate.set(detection.date, (byDate.get(detection.date) ?? 0) + 1);
      const observations = Array.from({ length: days }, (_, offset) => {
        const date = addDays(start, offset);
        return { date, value: date > latestFeedDate ? null : byDate.get(date) ?? 0 };
      });
      return Response.json({
        observations,
        summary: summarize(observations.map((observation) => observation.value)),
        dataset,
        region: { id: region.id, name: region.name, nameMy: region.nameMy, lat: region.lat, lon: region.lon },
        location,
        spatialBasis: boundary ? areaTotalBasis(Boolean(township), "detection count") : { kind: "buffer" as const, label: `${pointLabel({ ...region, type: "region" })} · ±0.1° box (about 22 km × 22 km)` },
        period: { start, end },
        source: dataset.source,
        geographicCoverage: `${coverage} Public trailing-seven-day feed, latest detection date ${latestFeedDate}. Current-day totals are incomplete. Zero means no detections in this feed, not proof of no fires.`,
        observedAt: new Date().toISOString(),
        missingCount: observations.filter(d => d.value === null).length,
      }, { headers: { "cache-control": "no-store" } });
    } catch (cause) {
      console.error("[explore] NASA FIRMS request failed:", cause);
      return error("NASA FIRMS could not return observations. Please try again later.", 502);
    }
  }

  if (dataset.id === "vegetation-index" || dataset.id === "agriculture-vegetation-index") {
    if (days > 366) return error("Choose up to one year for vegetation charts.", 400);
    try {
      const observations = await fetchNdviRange(location.lat, location.lon, start, end, 50000);
      return Response.json({
        observations, summary: summarize(observations.map(d => d.value)), dataset,
        region: regionInfo, location, spatialBasis: windowBasis(location, subsetWindow(250)),
        period: { start, end }, source: dataset.source,
        geographicCoverage: `${windowCoverageText("urban-vegetation", Boolean(township)).split(" Only pixels mapped")[0]} Each value represents a 16-day composite beginning on the shown date.`,
        observedAt: new Date().toISOString(), missingCount: observations.filter(d => d.value === null).length,
      }, { headers: { "cache-control": "no-store" } });
    } catch (cause) {
      console.error("[explore] MODIS request failed", cause);
      return error("The vegetation data service could not respond. Try again or choose an earlier period; no sample values have been substituted.", 502);
    }
  }
  if (!dataset.parameter) return error(dataset.reason || "No observation data is available for this indicator. The home preview contains illustrative figures only.", 503);
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
      region: regionInfo,
      location,
      spatialBasis: point,
      period: { start, end },
      source: dataset.source,
      geographicCoverage: pointNote,
      ...(crossesPowerBreak(dataset.parameter.split(","), start) ? { dataWarning: POWER_BREAK_NOTE } : {}),
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
