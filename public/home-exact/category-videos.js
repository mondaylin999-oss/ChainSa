// Keep decorative category footage playing, with a manual pause option.
(() => {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = motionPreference.matches;
  const initialized = new WeakSet();

  function updatePlayback() {
    document.querySelectorAll(".category-video").forEach(video => {
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = !paused;
      if (paused) video.pause();
      else video.play().catch(() => {
        // Keep the poster visible when the browser blocks automatic playback.
      });
    });
    document.querySelectorAll("[data-category-motion-toggle]").forEach(button => {
      const label = paused ? "Play videos" : "Pause videos";
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute("aria-pressed", String(paused));
    });
  }

  // The home template mounts through its own renderer after DOMContentLoaded.
  function initialize() {
    let changed = false;
    document.querySelectorAll(".category-video").forEach(video => {
      if (initialized.has(video)) return;
      initialized.add(video);
      changed = true;
    });
    if (changed) updatePlayback();
  }

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest("[data-category-motion-toggle]")) return;
    paused = !paused;
    updatePlayback();
  });
  motionPreference.addEventListener("change", event => {
    paused = event.matches;
    updatePlayback();
  });
  new MutationObserver(initialize).observe(document.body, { childList: true, subtree: true });
  initialize();
})();
