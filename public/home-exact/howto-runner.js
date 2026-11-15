// Run the detective along the connector in screen coordinates so it stays
// the same size when the three-step layout resizes or stacks on mobile.
(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 860px)");

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
    return preference.matches || document.hidden;
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
    if (!paused && runner) frame = requestAnimationFrame(tick);
  }

  function initialize() {
    const next = document.querySelector(".howto-runner");
    if (!next || next === runner) return;
    resizeObserver?.disconnect();
    runner = next;
    journey = runner.closest(".howto-journey");
    route = journey.querySelector("#howto-route");
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(journey);
    measure();
    update();
  }

  preference.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  mobile.addEventListener("change", measure);
  new MutationObserver(initialize).observe(document.body, { childList: true, subtree: true });
  initialize();
})();
