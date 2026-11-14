# EarthLens interface reference

`earthlens.html` is the self-contained interface supplied by the user. Its bundled map, charts, styles, translations, and dependency license notices are preserved.

`scripts/prepare-earthlens.mjs` generates `public/earthlens.html` before development and production builds. It replaces the reference's preview-only network adapter with `scripts/earthlens-adapter.js`. The previous dashboard remains available at `/earthlens.html`; the current Home and Explore Map UI is served at `/`.

Live analysis uses the reference's NASA POWER client and calculations. Live chat calls the existing `/api/earthlens-chat` server route, keeping credentials on the server. Demo analysis and chat use explicitly labelled sample data. The reference's map analysis does not currently support live FIRMS fire data or persistent database caching. The existing chat endpoint still supports FIRMS when configured.

The supplied UI is a compiled artifact. Changes to its internal function names require reviewing the adapter. Its original source project would be needed to edit those components directly.
