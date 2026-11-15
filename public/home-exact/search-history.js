(function () {
  "use strict";
  var state = { cards: [], loading: true, error: "", busyId: null };
  var root;
  var renderedLocale;
  function send(action, id) {
    window.parent.postMessage({ type: "earthlens-home-navigation", action: action, id: id }, window.location.origin);
  }
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function render() {
    if (!root) return;
    renderedLocale = document.documentElement.lang;
    var my = renderedLocale === "my";
    var fragment = document.createDocumentFragment();
    if (state.error) fragment.appendChild(element("p", "history-notice", state.error));
    if (state.loading) fragment.appendChild(element("p", "history-empty", my ? "မှတ်တမ်းများ ဖွင့်နေသည်…" : "Opening saved searches…"));
    else if (!state.cards.length) {
      var empty = element("div", "history-empty");
      empty.appendChild(element("h3", "", my ? "သိမ်းထားသော ရှာဖွေမှု မရှိသေးပါ" : "Your discoveries start here"));
      empty.appendChild(element("p", "", my ? "Explore တွင် အချက်အလက်ရှာပါ။ အောင်မြင်သော ရှာဖွေမှုများကို ဤနေရာတွင် အလိုအလျောက် သိမ်းပေးပါမည်။" : "Explore a location and dataset. Successful searches with observations will appear here automatically."));
      fragment.appendChild(empty);
    } else {
      var grid = element("div", "history-grid");
      state.cards.slice(0, 3).forEach(function (card) {
        var article = element("article", "history-card");
        var header = element("div", "history-card-heading");
        header.appendChild(element("span", "history-badge", card.locationType === "township" ? (my ? "မြို့နယ်" : "Township") : (my ? "တိုင်း / ပြည်နယ်" : "State / region")));
        var time = element("time", "", new Date(card.savedAt).toLocaleString(my ? "my-MM" : "en-GB")); time.dateTime = card.savedAt; header.appendChild(time);
        article.appendChild(header);
        var open = element("button", "history-open"); open.type = "button";
        open.appendChild(element("h2", "", my ? card.locationMy || card.location : card.location));
        open.appendChild(element("span", "", card.dataset + " ↗")); open.onclick = function () { send("history-open", card.id); }; article.appendChild(open);
        article.appendChild(element("p", "", card.selection.start + " — " + card.selection.end + " UTC"));
        var values = card.preview.filter(function (p) { return p.value !== null; }).map(function (p) { return p.value; });
        if (values.length) {
          var min = Math.min.apply(null, values), max = Math.max.apply(null, values), drawing = false;
          var first = Date.parse(card.preview[0].date), span = Math.max(1, Date.parse(card.preview[card.preview.length - 1].date) - first);
          var path = card.preview.map(function (p) {
            if (p.value === null) { drawing = false; return ""; }
            var command = drawing ? "L" : "M"; drawing = true;
            return command + (8 + (Date.parse(p.date) - first) / span * 284) + "," + (max === min ? 40 : 72 - (p.value - min) / (max - min) * 64);
          }).join(" ");
          var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 300 80"); svg.setAttribute("class", "history-sparkline"); svg.setAttribute("aria-hidden", "true");
          var line = document.createElementNS(svg.namespaceURI, "path"); line.setAttribute("d", path); line.setAttribute("fill", "none"); line.setAttribute("stroke", "currentColor"); line.setAttribute("stroke-width", "2.5"); svg.appendChild(line); article.appendChild(svg);
        }
        var stats = element("div", "history-stats");
        var mean = element("span", "", my ? "ပျမ်းမျှ" : "Mean"); mean.appendChild(element("strong", "", (card.summary.mean === null ? "—" : Number(card.summary.mean.toFixed(2))) + " " + card.unit)); stats.appendChild(mean);
        var count = element("span", "", my ? "အချက်အလက်အရေအတွက်" : "Observations"); count.appendChild(element("strong", "", String(card.summary.count))); stats.appendChild(count); article.appendChild(stats);
        article.appendChild(element("p", "history-source", card.source));
        var actions = element("div", "history-actions");
        var download = element("button", "button-primary", state.busyId === card.id ? (my ? "ပြင်ဆင်နေသည်…" : "Preparing…") : (my ? "PDF ဒေါင်းလုဒ်" : "Download PDF")); download.type = "button"; download.disabled = !!state.busyId; download.onclick = function () { send("history-download", card.id); }; actions.appendChild(download);
        var remove = element("button", "button-secondary", my ? "ဖျက်ရန်" : "Delete"); remove.type = "button"; remove.onclick = function () { send("history-delete", card.id); }; actions.appendChild(remove);
        article.appendChild(actions); grid.appendChild(article);
      });
      fragment.appendChild(grid);
    }
    root.replaceChildren(fragment);
  }
  function initialize() {
    var next = document.querySelector("[data-recent-history]");
    if (!next || next === root) return;
    root = next; render(); send("history-ready");
  }
  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "earthlens-history-data") return;
    state = event.data; render();
  });
  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element) || !event.target.closest("[data-view-history]")) return;
    event.preventDefault(); send("history-all");
  });
  // Observe the parent template container, not cards we render ourselves.
  new MutationObserver(initialize).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(function () { if (document.documentElement.lang !== renderedLocale) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  initialize();
})();
