import type { ObservationResponse, ObservationSelection } from "../client/data-service";
import { selectionKey, responseMatchesSelection } from "../client/data-service";

export interface HistoryCard {
  id: string;
  savedAt: string;
  selection: ObservationSelection;
  location: string;
  locationMy: string;
  locationType: "region" | "township";
  region: string;
  dataset: string;
  unit: string;
  summary: ObservationResponse["summary"];
  source: string;
  preview: { date: string; value: number | null }[];
}

const DB_NAME = "earthlens-search-history";
export const HISTORY_CHANGED = "earthlens-history-changed";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("History cannot be saved in this browser. You can still explore data.")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("cards", { keyPath: "id" });
      db.createObjectStore("results", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Your browser could not open saved history. Check its storage settings."));
    request.onblocked = () => reject(new Error("Close other TerraAI tabs and try opening history again."));
  });
}

async function transaction<T>(mode: IDBTransactionMode, task: (tx: IDBTransaction, set: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["cards", "results"], mode);
    let value: T;
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("History could not be saved or read. Your browser storage may be full or unavailable.")); };
    try { task(tx, next => { value = next; }); }
    catch { tx.abort(); db.close(); reject(new Error("History could not be saved or read. Your browser storage may be full or unavailable.")); }
  });
}

export function makeHistoryCard(selection: ObservationSelection, result: ObservationResponse, savedAt = new Date().toISOString()): HistoryCard {
  if (!responseMatchesSelection(result, selection)) throw new Error("The returned location does not match this search. Please try again.");
  if (!result.observations.some(point => point.value !== null && Number.isFinite(point.value))) throw new Error("There are no observations to save.");
  const location = result.location ?? { ...result.region, type: "region" as const };
  // Retain actual observations for the thumbnail, including gaps. The complete series is stored separately.
  const step = Math.max(1, Math.ceil(result.observations.length / 100));
  const preview = result.observations.filter((_, i) => i % step === 0 || i === result.observations.length - 1).map(({ date, value }) => ({ date, value }));
  return { id: selectionKey(selection), savedAt, selection: { ...selection }, location: location.name, locationMy: location.nameMy,
    locationType: location.type, region: result.region.name, dataset: result.dataset.label, unit: result.dataset.unit,
    summary: { ...result.summary }, source: result.source.name, preview };
}

function announce() { if (typeof window !== "undefined") window.dispatchEvent(new Event(HISTORY_CHANGED)); }

export async function saveSearch(selection: ObservationSelection, result: ObservationResponse): Promise<void> {
  const card = makeHistoryCard(selection, result);
  await transaction<void>("readwrite", tx => {
    tx.objectStore("cards").put(card);
    tx.objectStore("results").put({ id: card.id, result });
  });
  announce();
}

export async function listHistory(): Promise<HistoryCard[]> {
  const rows = await transaction<HistoryCard[]>("readonly", (tx, set) => {
    const request = tx.objectStore("cards").getAll();
    request.onsuccess = () => set(request.result);
  });
  return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function readHistory(id: string): Promise<{ card: HistoryCard; result: ObservationResponse } | undefined> {
  return transaction("readonly", (tx, set) => {
    let card: HistoryCard | undefined;
    let result: ObservationResponse | undefined;
    const getCard = tx.objectStore("cards").get(id);
    const getResult = tx.objectStore("results").get(id);
    const finish = () => { if (card && result) set({ card, result }); };
    getCard.onsuccess = () => { card = getCard.result; finish(); };
    getResult.onsuccess = () => { result = getResult.result?.result; finish(); };
  });
}

export async function deleteHistory(id: string): Promise<void> {
  await transaction<void>("readwrite", tx => { tx.objectStore("cards").delete(id); tx.objectStore("results").delete(id); });
  announce();
}

export async function clearHistory(): Promise<void> {
  await transaction<void>("readwrite", tx => { tx.objectStore("cards").clear(); tx.objectStore("results").clear(); });
  announce();
}
