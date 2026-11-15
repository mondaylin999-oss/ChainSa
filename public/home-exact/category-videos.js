// Load decorative footage only when its card is visible; preserve posters elsewhere.
(() => {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = motionPreference.matches;
  const initialized = new WeakSet();
  const visible = new WeakSet();
  function updatePlayback() {
    document.querySelectorAll(".category-video").forEach(video => {
      if (paused || document.hidden || !visible.has(video)) { video.pause(); return; }
      if (!video.getAttribute("src") && video.dataset.src) video.src = video.dataset.src;
      video.play().catch(() => { /* The poster remains when autoplay is blocked. */ });
    });
    document.querySelectorAll("[data-category-motion-toggle]").forEach(button => {
      const label = document.documentElement.lang === "my"
        ? (paused ? "ဗီဒီယိုများ ဖွင့်ရန်" : "ဗီဒီယိုများ ခေတ္တရပ်ရန်")
        : (paused ? "Play videos" : "Pause videos");
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute("aria-pressed", String(paused));
    });
  }
  const visibility = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
    updatePlayback();
  }) : null;
  function initialize() {
    let changed = false;
    document.querySelectorAll(".category-video").forEach(video => {
      if (initialized.has(video)) return;
      initialized.add(video);
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      if (visibility) visibility.observe(video); else visible.add(video);
      changed = true;
    });
    if (changed) updatePlayback();
  }
  document.addEventListener("click", event => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-category-motion-toggle]")) return;
    paused = !paused;
    updatePlayback();
  });
  document.addEventListener("visibilitychange", updatePlayback);
  motionPreference.addEventListener("change", event => { paused = event.matches; updatePlayback(); });
  new MutationObserver(initialize).observe(document.body, {childList:true,subtree:true});
  new MutationObserver(updatePlayback).observe(document.documentElement, {attributes:true,attributeFilter:["lang"]});
  initialize();
})();
