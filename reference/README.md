# EarthLens interface reference

`earthlens.html` is the self-contained interface supplied by the user. Its bundled map, charts, styles, translations, and dependency license notices are preserved.

`scripts/prepare-earthlens.mjs` generates `public/earthlens.html` before development and production builds. It replaces the reference's preview-only network adapter with `scripts/earthlens-adapter.js`. Next.js serves this dashboard at `/` through a rewrite.

Live analysis uses the reference's NASA POWER client and calculations. Live chat calls the existing `/api/earthlens-chat` server route, keeping credentials on the server. Demo analysis and chat use explicitly labelled sample data. The reference's map analysis does not currently support live FIRMS fire data or persistent database caching. The existing chat endpoint still supports FIRMS when configured.

The supplied UI is a compiled artifact. Changes to its internal function names require reviewing the adapter. Its original source project would be needed to edit those components directly.

## Dashboard layout

`scripts/earthlens-dashboard.js` replaces the compiled host component during generation, while reusing the bundled map, charts, evidence display, translations, and data models. `scripts/earthlens-dashboard.css` contains the responsive dashboard layout. Edit these source files rather than generated `public/earthlens.html` or the original reference artifact. The generator checks the component boundaries and stops if the reference entry points change.

Desktop uses a topic sidebar, a central map with embedded chat, and a right panel with location, measurement, observation period, chart, and details. Small screens use Map and Graph & details views. Region and measurement changes refresh the analysis; superseded requests are cancelled. Changing location or data mode starts a new chat context. The township list added separately in the workspace does not change the analysis location: measurements and map selection still use state and region reference points.
