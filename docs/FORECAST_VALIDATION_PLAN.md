# 30-day outlook — forecast validation plan (Phase 2, not started)

Status: **no forecasting model is used yet.** The chatbot says the 30-day outlook cannot be
calculated reliably and shows clearly labelled historical patterns instead.
The Phase 3 hook is `src/features/earthlens-chat/server/forecast/validated-outlook.ts` (it returns `null` today).

## Why not NASA data for the forecast?
- NASA POWER is observation/re-analysis only (MERRA-2 from 1981, GEOS FP-IT ~2 days behind). It is never a forecast.
- NASA GMAO GEOS-S2S-3 (released March 2026) is NASA's sub-seasonal/seasonal model, but its near-real-time
  output is shared "upon request" (https://gmao.gsfc.nasa.gov/gmao-products/geos-s2s-3/data-access_geos-s2s-3/).
  It can be added later if GMAO grants access.

## Candidate forecast data (chosen: ECMWF SEAS5 + GloFAS)
| Use | Dataset | Hindcasts for validation | Access |
|---|---|---|---|
| 30-day rainfall / soil moisture | ECMWF SEAS5 via Copernicus C3S, `seasonal-original-single-levels` (daily total precipitation, volumetric soil moisture) | 1993–2016 | CDS API, free account, CC-BY |
| River flood | GloFAS (Copernicus CEMS) river discharge; reforecasts 46-day lead, 11 members | 2003–2022 | EWDS API, free account, CEMS-FLOODS licence |
| Possible later | ECMWF EC46 / ENS extended (daily, 46 days, open CC-BY since 2024) | open hindcast access not confirmed | ECMWF open data / Open-Meteo |

## Events (per region point, 30-day window starting tomorrow)
- 30-day rainfall terciles (below / near / above normal) vs the NASA POWER 1981–2025 distribution for the same calendar window
- dry spell: 30-day rainfall below the 20th percentile
- very heavy rain: at least one day above the wettest 1% of days since 1981
- river flood: GloFAS discharge above its 2-, 5- and 20-year return-period thresholds

## Probability calculation
1. For each ensemble member, compute the event quantity for the window (sum over the days of lead 1–30).
2. Remove model bias by ranking each member against the model's own hindcast climate for the same start month and lead
   ("model-percentile" mapping), then apply the observed category thresholds.
3. Probability = fraction of members in the category.
4. Optional recalibration (e.g. logistic regression on the ensemble mean anomaly), fitted with leave-one-year-out cross-validation.

## Validation
- Truth: NASA POWER PRECTOTCORR at the 15 region points; NASA IMERG Final (2001+) as a second check.
- Scores vs climatology: Brier Skill Score (each event), Ranked Probability Skill Score (terciles), ROC area, reliability diagrams.
- Split by region and by season (monsoon May–Oct, dry Nov–Apr) and by start month.
- 95% confidence intervals by bootstrapping whole years.

### Gate (fixed before seeing results)
A probability is shown for a region × season × event only if
- skill score > 0 **and** its lower 95% bound > 0,
- ROC area ≥ 0.6,
- no strong over-confidence (reliability slope not far below 1).
Otherwise: "A reliable 30-day forecast cannot be calculated for this region/season", plus the historical pattern.

## Output consumed by the chatbot
`data/forecast/skill-table.json` (validation results, versioned) and `data/forecast/outlook-YYYY-MM-DD.json`
(probabilities for passing cells only, with model name, version, issue date, hindcast period and scores).

## Practical notes
- The download and validation must run where Copernicus and NASA are reachable (e.g. your computer), as an offline
  Python job — never during a chat request.
- Expectation: 30-day rainfall skill in the tropics is often low, so many cells may fail the gate. Soil-moisture
  persistence and river discharge are the most likely to show skill. No result will be assumed before the study runs.
