import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearHistory, deleteHistory, listHistory, makeHistoryCard, readHistory, saveSearch } from "@/features/explorer/history/store";
import { historyPdfFilename } from "@/features/explorer/history/pdf";
import { responseMatchesSelection, selectionKey, type ObservationResponse, type ObservationSelection } from "@/features/explorer/client/data-service";
import { DATASETS } from "@/features/explorer/catalog";

const selection: ObservationSelection = { topicId: "agriculture", regionId: "yangon", datasetId: "air-temperature", start: "2024-01-01", end: "2024-01-03" };
function result(): ObservationResponse {
  return { dataset: DATASETS.find(dataset => dataset.id === "air-temperature")!,
    region: { id: "yangon", name: "Yangon", nameMy: "ရန်ကုန်", lat: 16.8, lon: 96.1 },
    location: { id: "yangon", name: "Yangon", nameMy: "ရန်ကုန်", lat: 16.8, lon: 96.1, type: "region" },
    observations: [{ date: "2024-01-01", value: 20 }, { date: "2024-01-02", value: null }, { date: "2024-01-03", value: 24 }],
    summary: { count: 2, mean: 22, min: 20, max: 24, latest: 24 }, period: { start: selection.start, end: selection.end },
    source: { name: "NASA POWER", url: "https://power.larc.nasa.gov/" }, geographicCoverage: "Representative point", missingCount: 1, observedAt: "2024-02-01T00:00:00Z" };
}
beforeEach(async () => { await clearHistory(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("browser saved search history", () => {
  it("persists complete snapshots separately from lightweight cards, including missing readings", async () => {
    const input = result();
    await saveSearch(selection, input);
    input.observations[0].value = 999;
    const cards = await listHistory();
    expect(cards).toHaveLength(1);
    expect(cards[0].preview[1].value).toBeNull();
    expect(cards[0]).not.toHaveProperty("observations");
    const saved = await readHistory(cards[0].id);
    expect(saved?.result.observations[0].value).toBe(20);
    expect(saved?.result.missingCount).toBe(1);
  });
  it("updates an identical search instead of creating duplicate cards", async () => {
    await saveSearch(selection, result());
    const updated = result(); updated.observations[0].value = 19;
    await saveSearch(selection, updated);
    expect(await listHistory()).toHaveLength(1);
    expect((await readHistory(selectionKey(selection)))?.result.observations[0].value).toBe(19);
  });
  it("keeps region and township searches distinct and refuses mismatched results", async () => {
    const township = { ...selection, townshipId: "MMR013040" };
    expect(responseMatchesSelection(result(), township)).toBe(false);
    await expect(saveSearch(township, result())).rejects.toThrow("does not match");
    const local = result(); local.location = { id: township.townshipId, name: "Hlaing", nameMy: "လှိုင်", type: "township", lat: 16.84, lon: 96.12 };
    await saveSearch(township, local); await saveSearch(selection, result());
    expect(await listHistory()).toHaveLength(2);
    expect((await readHistory(selectionKey(township)))?.card.location).toBe("Hlaing");
  });
  it("does not store empty results or results for a different period or dataset", async () => {
    const empty = result(); empty.observations = [{ date: selection.start, value: null }];
    await expect(saveSearch(selection, empty)).rejects.toThrow("no observations");
    expect(responseMatchesSelection(result(), { ...selection, end: "2024-02-01" })).toBe(false);
    expect(responseMatchesSelection(result(), { ...selection, datasetId: "rainfall" })).toBe(false);
    expect(await listHistory()).toEqual([]);
  });
  it("reopens saved data without contacting a data service", async () => {
    await saveSearch(selection, result());
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await readHistory(selectionKey(selection)))?.result.summary.mean).toBe(22);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("deletes both a card and its result, and clears the full collection", async () => {
    await saveSearch(selection, result());
    await deleteHistory(selectionKey(selection));
    expect(await listHistory()).toEqual([]);
    expect(await readHistory(selectionKey(selection))).toBeUndefined();
    await saveSearch(selection, result()); await clearHistory();
    expect(await listHistory()).toEqual([]);
    expect(await readHistory(selectionKey(selection))).toBeUndefined();
  });
  it("rolls back the card if saving the result fails", async () => {
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === "results") throw new DOMException("full", "QuotaExceededError");
      return put.call(this, value, key);
    });
    await expect(saveSearch(selection, result())).rejects.toThrow();
    expect(await listHistory()).toEqual([]);
  });
  it("reports unsupported storage without hiding environmental observations", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(listHistory()).rejects.toThrow("cannot be saved");
  });
  it("builds stable selection identities and safe PDF filenames", () => {
    expect(selectionKey({ ...selection, townshipId: "" })).toBe(selectionKey(selection));
    const card = makeHistoryCard(selection, result()); card.location = "Yangon / <test>";
    expect(historyPdfFilename(card)).toMatch(/^TerraAI-[a-zA-Z0-9_-]+\.pdf$/);
  });
});
