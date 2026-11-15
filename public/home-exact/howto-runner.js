// Run the detective along the connector in screen coordinates so it stays
// the same size when the three-step layout resizes or stacks on mobile.
(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 860px)");
  let userPaused = preference.matches;
  let pointerNear = false;
  let focusWithin = false;
  let sectionListeners;
  let journey;
  let runner;
  let route;
  let resizeObserver;
  let geometry;
  let frame;
  let lastTime;
  let progress = 0;
  const duration = 18000;

  function isPaused() {
    return userPaused || (!pointerNear && !focusWithin);
  }

  function measure() {
    if (!journey || !runner || !route) return;
    if (mobile.matches) {
      geometry = { vertical: true, height: journey.clientHeight };
    } else {
      const rect = journey.getBoundingClientRect();
      geometry = {
        vertical: false,
        rect,
        matrix: route.getScreenCTM(),
        length: route.getTotalLength(),
      };
    }
    position();
  }

  function position() {
    if (!geometry) return;
    let x, y;
    if (geometry.vertical) {
      x = 20;
      y = 20 + progress * Math.max(0, geometry.height - 50);
    } else {
      if (!geometry.matrix) return;
      const point = route.getPointAtLength(progress * geometry.length);
      const mapped = point.matrixTransform(geometry.matrix);
      x = mapped.x - geometry.rect.left;
      y = mapped.y - geometry.rect.top;
    }
    runner.style.transform = `translate3d(${x - 26}px, ${y - 49}px, 0)`;
    runner.setAttribute("data-ready", "");
  }

  function tick(time) {
    if (isPaused()) return;
    if (lastTime !== undefined) progress = (progress + Math.min(time - lastTime, 100) / duration) % 1;
    lastTime = time;
    position();
    frame = requestAnimationFrame(tick);
  }

  function update() {
    const paused = isPaused();
    cancelAnimationFrame(frame);
    lastTime = undefined;
    if (journey) journey.dataset.motionPaused = String(paused);
    const button = document.querySelector("[data-howto-motion-toggle]");
    if (button) {
      const label = paused ? "Play animation" : "Pause animation";
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute("aria-pressed", String(paused));
    }
    if (!paused && runner) frame = requestAnimationFrame(tick);
  }

  function initialize() {
    const next = document.querySelector(".howto-runner");
    if (!next || next === runner) return;
    resizeObserver?.disconnect();
    sectionListeners?.abort();
    runner = next;
    journey = runner.closest(".howto-journey");
    route = journey.querySelector("#howto-route");
    const section = journey.closest(".howto-section");
    sectionListeners = new AbortController();
    const options = { signal: sectionListeners.signal };
    pointerNear = section.matches(":hover");
    focusWithin = section.contains(document.activeElement);
    section.addEventListener("pointerenter", () => {
      pointerNear = true;
      update();
    }, options);
    section.addEventListener("pointerleave", () => {
      pointerNear = false;
      update();
    }, options);
    section.addEventListener("focusin", () => {
      focusWithin = true;
      update();
    }, options);
    section.addEventListener("focusout", event => {
      focusWithin = section.contains(event.relatedTarget);
      update();
    }, options);
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(journey);
    measure();
    update();
  }

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-howto-motion-toggle]")) return;
    userPaused = !isPaused();
    update();
  });
  preference.addEventListener("change", event => {
    userPaused = event.matches;
    update();
  });
  mobile.addEventListener("change", measure);
  new MutationObserver(initialize).observe(document.body, { childList: true, subtree: true });
  initialize();
})();
