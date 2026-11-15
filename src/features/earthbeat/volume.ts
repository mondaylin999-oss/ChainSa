export const VOLUME_KEY = "earthlens-volume";
export const VOLUME_EVENT = "earthlens-volume-change";
export function readVolume(): number {
  try { const value = localStorage.getItem(VOLUME_KEY); const number = Number(value); return value !== null && Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 50; }
  catch { return 50; }
}
export function saveVolume(value: number) {
  const volume = Math.max(0, Math.min(100, value));
  try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* Session changes still work. */ }
  window.dispatchEvent(new CustomEvent(VOLUME_EVENT, { detail: volume }));
}
