import { afterEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/features/earthlens-chat/server/env";
import {
  BLACK_MARBLE_LAADS, blackMarbleTokenStatus, monthDirectories, parseDapAscii, parseListing, pixelAreaKm2, summariseMonth, tileFor, tileId, tileWindow, variableNamesFromDmr,
} from "@/features/explorer/server/black-marble-laads";
import { EE_REASONS, TOKEN_REASONS, blackMarbleState, earthEngineState } from "@/features/explorer/server/availability";
import { earthEngineStatus, resetEarthEngineStatusForTests } from "@/features/explorer/server/earth-engine";
import { DATASETS } from "@/features/explorer/catalog";
import { GET as getCatalog } from "@/app/api/explore/catalog/route";
import { POST } from "@/app/api/explore/observations/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetConfigForTests(); resetEarthEngineStatusForTests(); });
const request = (body: unknown) => new Request("http://localhost/api/explore/observations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const noEe = () => { vi.stubEnv("EARTH_ENGINE_PROJECT_ID", ""); vi.stubEnv("EARTH_ENGINE_SERVICE_ACCOUNT_JSON", ""); };

// Structure and attributes as served for VNP46A3 v002 (radiance is Float32 in nW·cm⁻²·sr⁻¹, scale 1, fill -999.9).
const DMR = `<?xml version="1.0"?><Dataset name="x"><Group name="HDFEOS"><Group name="GRIDS"><Group name="VIIRS_Grid_DNB_2d"><Group name="Data_Fields">
<Float32 name="AllAngle_Composite_Snow_Free"><Dim name="/YDim"/>
    <Attribute name="_FillValue" type="Float32">
        <Value>-999.9000244</Value>
    </Attribute>
    <Attribute name="scale_factor" type="Float64">
        <Value>1.</Value>
    </Attribute>
    <Attribute name="offset" type="Float64">
        <Value>0.</Value>
    </Attribute>
</Float32><Byte name="AllAngle_Composite_Snow_Free_Quality"/></Group></Group></Group></Group><Float64 name="lat"/></Dataset>`;
const OLD_PACKING = { scale: 0.1, offset: 0, fill: 65535 };
const LISTING = [{ name: "VNP46A3.A2024001.h27v07.002.2025161152621.h5" }, { name: "VNP46A3.A2024001.h27v06.002.2025161152500.h5" }, { name: "readme.txt" }];

describe("NASA Black Marble VNP46A3 from LAADS DAAC", () => {
  it("maps Myanmar locations to Black Marble tiles", () => {
    expect(tileId(tileFor(17.11, 96.11))).toBe("h27v07"); // Yangon
    expect(tileId(tileFor(21.4, 95.95))).toBe("h27v06");  // Mandalay
    expect(tileId(tileFor(21.52, 101.2))).toBe("h28v06");  // eastern Shan
    expect(tileId(tileFor(9.9, 98.6))).toBe("h27v08");     // southern Tanintharyi
  });
  it("lists monthly directories by day of year, including leap years", () => {
    expect(monthDirectories("2024-01-10", "2024-03-05").map(m => m.doy)).toEqual(["001", "032", "061"]);
    expect(monthDirectories("2023-03-01", "2023-03-31")[0].doy).toBe("060");
  });
  it("reads granule names from the public listing and variable paths from the granule's own metadata", () => {
    expect([...parseListing(LISTING)]).toEqual([["h27v07", LISTING[0].name], ["h27v06", LISTING[1].name]]);
    const names = variableNamesFromDmr(DMR);
    expect(names.value).toEqual(["AllAngle_Composite_Snow_Free", "HDFEOS_GRIDS_VIIRS_Grid_DNB_2d_Data_Fields_AllAngle_Composite_Snow_Free", "/HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data_Fields/AllAngle_Composite_Snow_Free"]);
    expect(names.quality[0]).toBe("AllAngle_Composite_Snow_Free_Quality");
    expect(() => variableNamesFromDmr("<Dataset/>")).toThrow("did not list");
  });
  it("parses OPeNDAP ASCII arrays row by row", () => {
    expect(parseDapAscii("Dataset: x\nAllAngle_Composite_Snow_Free.AllAngle_Composite_Snow_Free[0], 12, 65535\nAllAngle_Composite_Snow_Free.AllAngle_Composite_Snow_Free[1], 0, 7\n")).toEqual([[12, 65535], [0, 7]]);
  });
  it("selects the tile rows and columns for a box, with a stride for large areas", () => {
    const small = tileWindow({ h: 27, v: 7 }, [96.101, 16.801, 96.199, 16.899])!;
    expect(small).toMatchObject({ r0: 744, r1: 767, c0: 1464, c1: 1487, stride: 1 });
    const large = tileWindow({ h: 27, v: 6 }, [94, 20, 100, 28])!;
    expect(large.stride).toBeGreaterThan(1);
    expect(tileWindow({ h: 27, v: 7 }, [101, 16, 102, 17])).toBeNull();
  });
  it("uses only quality-0 pixels, keeps genuine zero lit area, and blanks mostly-invalid months", () => {
    const px = (value: number, quality = 0) => ({ lat: 17, value, quality });
    const ok = summariseMonth([px(30), px(4), px(12), px(0), px(65535, 255), px(80, 1)], 6, 1, OLD_PACKING);
    expect(ok.validShare).toBeCloseTo(4 / 6, 3);
    expect(ok.meanRadiance).toBe(1.15); // (3.0 + 0.4 + 1.2 + 0) / 4
    expect(ok.litAreaKm2).toBe(Number(pixelAreaKm2(17).toFixed(2))); // only 3.0 is ≥ 2
    expect(ok.sensitivityKm2).toEqual({ "0.5": Number((2 * pixelAreaKm2(17)).toFixed(2)), "1": Number((2 * pixelAreaKm2(17)).toFixed(2)) });
    const dark = summariseMonth([px(1), px(2), px(3)], 3, 1, OLD_PACKING);
    expect(dark.litAreaKm2).toBe(0);
    const cloudy = summariseMonth([px(30), px(65535, 255), px(20, 2), px(5, 1)], 4, 1, OLD_PACKING);
    expect(cloudy).toMatchObject({ meanRadiance: null, litAreaKm2: null });
    expect(summariseMonth([{ lat: 17, value: 30, quality: 0, stride: 3 }], 1, 1, OLD_PACKING).litAreaKm2).toBe(Number((9 * pixelAreaKm2(17)).toFixed(2)));
    expect(BLACK_MARBLE_LAADS.litThreshold).toBe(2);
  });
});

describe("verified availability (not just non-empty settings)", () => {
  const listingOk = (input: string | URL | Request) => String(input).endsWith("/2024/001.json") ? Response.json(LISTING) : null;
  it("reports a missing, valid, rejected or unreachable Earthdata token", async () => {
    vi.stubEnv("EARTHDATA_TOKEN", "");
    expect(await blackMarbleTokenStatus(vi.fn())).toBe("missing");
    vi.stubEnv("EARTHDATA_TOKEN", "token-valid-000000000001");
    expect(await blackMarbleTokenStatus(vi.fn(async (i: string | URL | Request) => listingOk(i) ?? new Response(DMR)))).toBe("valid");
    vi.stubEnv("EARTHDATA_TOKEN", "token-rejected-00000002");
    expect(await blackMarbleTokenStatus(vi.fn(async (i: string | URL | Request) => listingOk(i) ?? (String(i).includes("cmr.earthdata") ? Response.json({ errors: ["Token does not exist"] }, { status: 401 }) : new Response(null, { status: 302, headers: { location: "https://ladsweb.modaps.eosdis.nasa.gov/oauth/login?redirect=/x" } }))))).toBe("invalid");
    vi.stubEnv("EARTHDATA_TOKEN", "token-unreachable-0003");
    expect(await blackMarbleTokenStatus(vi.fn(async () => new Response("", { status: 503 })))).toBe("unavailable");
  });
  it("treats malformed Earth Engine settings as invalid, not available", async () => {
    vi.stubEnv("EARTH_ENGINE_PROJECT_ID", "demo-project");
    vi.stubEnv("EARTH_ENGINE_SERVICE_ACCOUNT_JSON", "{not json");
    expect(await earthEngineStatus()).toBe("invalid");
    noEe(); resetEarthEngineStatusForTests();
    expect(await earthEngineStatus()).toBe("missing");
  });
  it("prefers NASA LAADS, falls back to Earth Engine, and explains what is missing", () => {
    expect(blackMarbleState("valid", "missing")).toMatchObject({ available: true, access: "nasa-laads" });
    expect(blackMarbleState("missing", "valid")).toMatchObject({ available: true, access: "earth-engine" });
    expect(blackMarbleState("missing", "missing")).toMatchObject({ available: false, setupRequired: true, reason: TOKEN_REASONS.missing });
    expect(blackMarbleState("invalid", "missing")).toMatchObject({ available: false, setupRequired: true, reason: TOKEN_REASONS.invalid });
    expect(blackMarbleState("unavailable", "missing")).toMatchObject({ available: false, setupRequired: false });
    expect(blackMarbleState("missing", "invalid").reason).toContain(EE_REASONS.invalid);
    expect(earthEngineState("invalid", true)).toMatchObject({ available: true, setupRequired: false }); // public NASA fallback
    expect(earthEngineState("invalid", false)).toMatchObject({ available: false, reason: EE_REASONS.invalid });
  });
  it("shows accurate catalogue states for the Black Marble indicators", async () => {
    noEe(); vi.stubEnv("EARTHDATA_TOKEN", "");
    let catalog = await (await getCatalog()).json();
    const bm = (c: { datasets: { id: string }[] }) => ["nighttime-lights", "lit-area"].map(id => c.datasets.find(d => d.id === id) as unknown as Record<string, unknown>);
    for (const d of bm(catalog)) expect(d).toMatchObject({ available: false, setupRequired: true, reason: TOKEN_REASONS.missing });
    vi.stubEnv("EARTHDATA_TOKEN", "token-catalog-valid-0004");
    vi.stubGlobal("fetch", vi.fn(async (i: string | URL | Request) => listingOk(i) ?? new Response(DMR)));
    catalog = await (await getCatalog()).json();
    for (const d of bm(catalog)) expect(d).toMatchObject({ available: true, setupRequired: false, access: "nasa-laads" });
    // MODIS indicators keep their free NASA ORNL route when Earth Engine is absent.
    expect(catalog.datasets.find((d: { id: string }) => d.id === "forest-cover")).toMatchObject({ available: true, setupRequired: false });
  });
  it("labels both Black Marble entries as NASA and documents the threshold", () => {
    for (const id of ["nighttime-lights", "lit-area"]) {
      const d = DATASETS.find(x => x.id === id)!;
      expect(d.source.name).toContain("NASA Black Marble VNP46A3 v002");
      expect(d.limitations).toContain("not electricity consumption");
    }
    expect(DATASETS.find(x => x.id === "lit-area")!.limitations).toContain("not an official NASA definition");
  });
});

describe("Black Marble observation route", () => {
  it("returns a setup explanation when no credentials are configured", async () => {
    noEe(); vi.stubEnv("EARTHDATA_TOKEN", "");
    const res = await POST(request({ topicId: "energy", regionId: "yangon", datasetId: "lit-area", start: "2024-01-01", end: "2024-02-29" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TOKEN_REASONS.missing);
  });
  it("computes whole-township values from NASA LAADS pixels inside the boundary", async () => {
    noEe(); vi.stubEnv("EARTHDATA_TOKEN", "token-route-valid-00005");
    const fetcher = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = decodeURIComponent(String(input));
      if (url.endsWith(".json")) return Response.json(LISTING.map(f => ({ name: f.name.replace("A2024001", "A2024032") })).concat(LISTING));
      if (url.endsWith(".dmr")) return new Response(DMR);
      const m = url.match(/\[(\d+):(\d+):(\d+)\]\[(\d+):(\d+):(\d+)\]/)!;
      const [r0, rs, r1, c0, cs, c1] = m.slice(1).map(Number);
      const quality = url.includes("Quality");
      const lines = [];
      for (let r = r0, i = 0; r <= r1; r += rs, i++) {
        const cells = []; for (let c = c0; c <= c1; c += cs) cells.push(quality ? 0 : 12.0); // v002: already nW·cm⁻²·sr⁻¹
        lines.push(`v[${i}], ${cells.join(", ")}`);
      }
      return new Response(lines.join("\n"));
    });
    vi.stubGlobal("fetch", fetcher);
    const body = await (await POST(request({ topicId: "energy", regionId: "yangon", townshipId: "MMR013044", datasetId: "nighttime-lights", start: "2024-01-01", end: "2024-01-31" }))).json();
    expect(body.observations.map((o: { date: string; value: number }) => ({ date: o.date, value: o.value }))).toEqual([{ date: "2024-01-01", value: 12 }]);
    expect(body.observations[0].validShare).toBe(1);
    expect(body.spatialBasis).toEqual({ kind: "area-average", label: "Full Township Area Average" });
    expect(body.source.name).toContain("VNP46A3 v002");
    expect(body.geographicCoverage).toContain("quality flag 0");
    const auth = fetcher.mock.calls.find(c => String(c[0]).includes(".ascii"))![1]!;
    expect((auth.headers as Record<string, string>).Authorization).toBe("Bearer token-route-valid-00005");
  });
});

it("names a NASA product as the source of every catalogue dataset", () => {
  const nonNasa = DATASETS.filter(d => !/NASA/.test(d.source.name)).map(d => d.id);
  expect(nonNasa).toEqual([]);
});

it("distinguishes a valid token whose account has not authorized LAADS from an invalid token", async () => {
  const laadsRedirect = () => new Response(null, { status: 302, headers: { location: "https://ladsweb.modaps.eosdis.nasa.gov/oauth/login?redirect=/x" } });
  const listing = (i: string | URL | Request) => String(i).endsWith("/2024/001.json") ? Response.json([{ name: "VNP46A3.A2024001.h27v07.002.2025161152621.h5" }]) : null;
  vi.stubEnv("EARTHDATA_TOKEN", "token-not-authorized-0006");
  expect(await blackMarbleTokenStatus(vi.fn(async (i: string | URL | Request) => listing(i) ?? (String(i).includes("cmr.earthdata") ? Response.json({ feed: {} }) : laadsRedirect())))).toBe("not-authorized");
  vi.stubEnv("EARTHDATA_TOKEN", "token-bad-at-cmr-0000007");
  expect(await blackMarbleTokenStatus(vi.fn(async (i: string | URL | Request) => listing(i) ?? (String(i).includes("cmr.earthdata") ? Response.json({ errors: ["Token does not exist"] }, { status: 401 }) : laadsRedirect())))).toBe("invalid");
  expect(blackMarbleState("not-authorized", "missing")).toMatchObject({ available: false, setupRequired: true, reason: TOKEN_REASONS["not-authorized"] });
});

it("follows same-host LAADS redirects with session cookies but never sends the token to another host", async () => {
  vi.stubEnv("EARTHDATA_TOKEN", "token-redirect-follow-08");
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    if (url.endsWith("/2024/001.json")) return Response.json([{ name: "VNP46A3.A2024001.h27v07.002.2025161152621.h5" }]);
    if (url.endsWith(".dmr")) return new Response(null, { status: 302, headers: { location: "/session/check?next=1", "set-cookie": "laads_session=abc; Path=/" } });
    if (url.includes("/session/check")) return new Response(DMR);
    return new Response("unexpected", { status: 500 });
  });
  expect(await blackMarbleTokenStatus(fetcher)).toBe("valid");
  const followed = calls.find(c => c.url.includes("/session/check"))!;
  expect(followed.url.startsWith("https://ladsweb.modaps.eosdis.nasa.gov/")).toBe(true);
  expect(followed.headers.Cookie).toBe("laads_session=abc");
  expect(calls.every(c => c.url.startsWith("https://ladsweb.modaps.eosdis.nasa.gov/"))).toBe(true);
});

it("reads VNP46A3 v002 packing from the granule metadata and treats Float32 fill as missing", () => {
  const info = variableNamesFromDmr(DMR);
  expect(info).toMatchObject({ scale: 1, offset: 0 });
  expect(info.fill).toBeCloseTo(-999.9, 3);
  const px = (value: number, quality = 0) => ({ lat: 17, value, quality });
  const month = summariseMonth([px(25.3), px(0.6), px(0.2), px(-999.9000244), px(-999.9000244), px(40, 2)], 6, 1, info);
  expect(month.validShare).toBe(0.5);
  expect(month.meanRadiance).toBe(8.7);  // (25.3 + 0.6 + 0.2) / 3, no extra scaling
  expect(month.litAreaKm2).toBe(Number(pixelAreaKm2(17).toFixed(2))); // only 25.3 is ≥ 2
  const allFill = summariseMonth([px(-999.9000244), px(-999.9000244)], 2, 1, info);
  expect(allFill).toMatchObject({ meanRadiance: null, litAreaKm2: null }); // missing, never zero
});

it("keeps cached and parallel Black Marble results separate per place and month", async () => {
  vi.stubEnv("EARTHDATA_TOKEN", "token-cache-isolation-09");
  const { fetchBlackMarbleLaads } = await import("@/features/explorer/server/black-marble-laads");
  const box = (w: number, s: number) => ({ type: "Polygon" as const, coordinates: [[[w, s], [w + 0.02, s], [w + 0.02, s + 0.02], [w, s + 0.02], [w, s]]] });
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = decodeURIComponent(String(input));
    if (url.endsWith(".json")) {
      const doy = url.match(/\/(\d{3})\.json$/)![1];
      return Response.json([{ name: `VNP46A3.A2024${doy}.h27v07.002.2025161152621.h5` }, { name: `VNP46A3.A2024${doy}.h27v06.002.2025161152500.h5` }]);
    }
    if (url.endsWith(".dmr")) return new Response(DMR);
    const [, r0, rs, r1, c0, cs, c1] = url.match(/\[(\d+):(\d+):(\d+)\]\[(\d+):(\d+):(\d+)\]/)!.map(Number);
    // Radiance encodes the tile and the month, so any mix-up between places or months shows in the result.
    const value = (url.includes("h27v06") ? 30 : 10) + (url.includes("A2024032") ? 1 : 0);
    const lines = [];
    for (let r = r0, i = 0; r <= r1; r += rs, i++) { const cells = []; for (let c = c0; c <= c1; c += cs) cells.push(url.includes("Quality") ? 0 : value); lines.push(`v[${i}], ${cells.join(", ")}`); }
    return new Response(lines.join("\n"));
  });
  const yangon = box(96.15, 16.80), mandalay = box(96.08, 21.95);
  const [a, b] = await Promise.all([
    fetchBlackMarbleLaads(yangon, "test-yangon", "2024-01-01", "2024-02-29", fetcher),
    fetchBlackMarbleLaads(mandalay, "test-mandalay", "2024-01-01", "2024-02-29", fetcher),
  ]);
  expect(a.months.map(m => m.meanRadiance)).toEqual([10, 11]);
  expect(b.months.map(m => m.meanRadiance)).toEqual([30, 31]);
  const again = await fetchBlackMarbleLaads(yangon, "test-yangon", "2024-01-01", "2024-02-29", fetcher);
  expect(again.months.map(m => m.meanRadiance)).toEqual([10, 11]);
});
