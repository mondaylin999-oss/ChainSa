(function () {
  var key = 'earthlens-theme';
  function apply(theme) {
    theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-home-theme-toggle]').forEach(function (button) {
      button.setAttribute('aria-checked', String(theme === 'dark'));
      button.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      button.textContent = theme === 'dark' ? '☾ Dark mode' : '☀ Light mode';
    });
    window.dispatchEvent(new Event('earthlens-theme-change'));
  }
  function saved() { try { return localStorage.getItem(key) || 'dark'; } catch (_) { return 'dark'; } }
  apply(saved());
  window.addEventListener('storage', function (event) { if (event.key === key || event.key === null) apply(saved()); });
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element) || !event.target.closest('[data-home-theme-toggle]')) return;
    var theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, theme); } catch (_) {}
    apply(theme);
  });
  new MutationObserver(function () {
    var button = document.querySelector('[data-home-theme-toggle]');
    if (button && button.getAttribute('aria-checked') !== String(document.documentElement.dataset.theme === 'dark')) apply(document.documentElement.dataset.theme);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
