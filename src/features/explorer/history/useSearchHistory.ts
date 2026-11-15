"use client";

import { useCallback, useEffect, useState } from "react";
import { clearHistory, deleteHistory, HISTORY_CHANGED, listHistory, readHistory, type HistoryCard } from "./store";

export function useSearchHistory() {
  const [cards, setCards] = useState<HistoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setCards(await listHistory()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Saved searches could not be opened."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const listener = () => { void refresh(); };
    window.addEventListener(HISTORY_CHANGED, listener);
    window.addEventListener("focus", listener);
    return () => { window.removeEventListener(HISTORY_CHANGED, listener); window.removeEventListener("focus", listener); };
  }, [refresh]);
  const load = useCallback(async (id: string) => {
    try {
      const saved = await readHistory(id);
      if (!saved) throw new Error("This saved search is no longer on this device.");
      return saved;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This saved search could not be opened."); }
  }, []);
  const download = useCallback(async (id: string) => {
    setBusyId(id); setError("");
    try {
      const saved = await readHistory(id);
      if (!saved) throw new Error("This saved search is no longer on this device.");
      const { downloadHistoryPdf } = await import("./pdf");
      await downloadHistoryPdf(saved.card, saved.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The PDF could not be downloaded. Please try again."); }
    finally { setBusyId(null); }
  }, []);
  const remove = useCallback(async (id: string) => {
    try { await deleteHistory(id); }
    catch { setError("This card could not be deleted. Please try again."); }
  }, []);
  const clear = useCallback(async () => {
    try { await clearHistory(); }
    catch { setError("History could not be cleared. Please try again."); }
  }, []);
  return { cards, loading, error, setError, refresh, load, download, remove, clear, busyId };
}
