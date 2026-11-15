(function () {
  "use strict";
  function connectVideo() {
    var video = document.querySelector("[data-hero-video]");
    if (!video || video.dataset.playbackReady) return;
    video.dataset.playbackReady = "true";
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var inView = true;
    function updatePlayback() {
      if (reducedMotion.matches || document.hidden || !inView) video.pause();
      else video.play().catch(function () { /* The poster remains when autoplay is blocked. */ });
    }
    video.addEventListener("error", function () { video.style.visibility = "hidden"; });
    document.addEventListener("visibilitychange", updatePlayback);
    reducedMotion.addEventListener("change", updatePlayback);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        updatePlayback();
      }).observe(video);
    }
    updatePlayback();
  }
  // The Home template renders asynchronously into its iframe.
  var observer = new MutationObserver(function () {
    connectVideo();
    if (document.querySelector("[data-hero-video][data-playback-ready]")) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  connectVideo();
})();
