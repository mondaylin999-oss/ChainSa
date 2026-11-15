(() => {
  const key = "earthlens-volume";
  function read() { try { const raw = localStorage.getItem(key); const n = Number(raw); return raw !== null && Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50; } catch { return 50; } }
  let volume = read();
  function render() {
    document.querySelectorAll("[data-sound-volume]").forEach(input => { input.value = volume; });
    document.querySelectorAll("[data-volume-value]").forEach(output => { const value = volume + "%"; if (output.textContent !== value) output.textContent = value; });
    document.querySelectorAll("[data-volume-down]").forEach(button => { button.disabled = volume <= 0; });
    document.querySelectorAll("[data-volume-up]").forEach(button => { button.disabled = volume >= 100; });
  }
  function change(value) { volume = Math.max(0, Math.min(100, value)); try { localStorage.setItem(key, String(volume)); } catch {} render(); window.dispatchEvent(new CustomEvent("earthlens-volume-change", { detail: volume })); }
  document.addEventListener("input", event => { if (event.target.matches?.("[data-sound-volume]")) change(Number(event.target.value)); });
  document.addEventListener("click", event => { if (event.target.closest?.("[data-volume-down]")) change(volume - 10); if (event.target.closest?.("[data-volume-up]")) change(volume + 10); });
  window.addEventListener("storage", () => { volume = read(); render(); });
  new MutationObserver(render).observe(document.body, { childList: true, subtree: true });
  render();
})();
