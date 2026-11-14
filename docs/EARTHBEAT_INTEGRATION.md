# EARTHBEAT graph and sound

Adapted from the user-supplied `MODIS_NDVI_Integration_Handover.zip`, specifically the shared-observation design in `EarthbeatChartPanel.tsx`, `EnvironmentalChart.tsx`, `EarthbeatPlayer.tsx`, and `sonificationEngine.ts`. The host uses its existing NASA POWER analysis response; no new dataset retrieval is introduced.

## Interaction

- Select a location, measurement and observation period using the existing dashboard controls.
- A dated series drives both the graph and EARTHBEAT. For measurements with multiple channels, such as temperature mean/minimum/maximum, choose the channel in the graph panel.
- Play produces one synthesized tone per valid observation and moves the graph cursor to that exact date and value. Playback defaults to four observations per second.
- Click, tap or drag across the graph to pause playback, select the nearest valid date and audition its tone. Play continues from the selection.
- Keyboard: focus the graph, use Left/Right or Home/End to select and audition points; Space/Enter toggles playback.
- Pause stops active tones and timers. Restart selects the first valid point without automatically playing. Volume includes mute; speed supports 1, 2, 4 or 8 observations per second.
- Changing the data or audio channel disposes old playback. Hiding the page or switching to the mobile Map view pauses playback. No sound autoplays on load or simple mouse hover.

## Data meaning

The chart uses actual dates for horizontal positions and data-derived vertical bounds, including negative values and temperatures above 1. Explicit missing values break the line, and invalid or missing observations do not produce notes. Audio advances in equal steps per valid observation, not in proportion to elapsed calendar time. The displayed date spacing remains accurate.

Each selected series maps its valid minimum and maximum to 220–880 Hz, with a constant series mapped to 550 Hz. The pitch scale is relative to this series, so equal pitches from different locations or periods do not imply equal measurements. The range is shown beside the controls. These sounds are representations of measurements, not recordings from nature. The production application uses live data only; failed retrieval never falls back to sample observations.

## Implementation and verification

`src/features/earthbeat/core.ts` contains the shared model and lazy Web Audio engine. `scripts/earthbeat-panel.js` provides the React/SVG integration in the existing reference bundle; the generator transpiles the typed core at build time and injects it beside the dashboard. `scripts/earthbeat-panel.css` uses the dashboard palette. The original reference artifact stays intact.

Tests cover date positions, missing values, pitch mapping, graph selection to sound, playback cursor progression, mute, interruption, cleanup and asynchronous audio-start cancellation. Browser verification covers the interactive UI and browser audio startup; automated tests do not replace listening on the user's output device.

The ZIP's MODIS NDVI client/backend contract is not connected by this change. MODIS still needs an authenticated Earth Engine backend before live MODIS retrieval can be claimed. The graph/audio interface can consume its processed observations once that data path is implemented.
