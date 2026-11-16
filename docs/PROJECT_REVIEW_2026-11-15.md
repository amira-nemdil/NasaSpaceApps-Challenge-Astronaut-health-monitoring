**AstroPulse project review — 15 November 2026**

AstroPulse has a functioning React simulation and a reproducible Python anomaly model. The deployed application does not connect those two parts. The highest priority improvements are to remove unsupported treatment instructions, correct alert aggregation, fix a reproducible page crash, and deploy and connect the model API.

This review inspected the local repository and GitHub `main` at commit `34574ad91f79f0dcebd76d48c52e3020bef72491`, ran the software, rebuilt the model from the local MMASH data, and exercised the public Vercel application in Chrome. No application fixes or production deployments were made. Recommendations below describe proposed work.

Public site: https://astronaut-health-monitoring-nasa-app-infinitydz.vercel.app/

Repository: https://github.com/amira-nemdil/NasaSpaceApps-Challenge-Astronaut-health-monitoring

The hosted JavaScript and CSS were byte-for-byte identical to the locally built assets. This ties the live behavior described below to the reviewed source, without access to Vercel's private project configuration.

| Verification | Result | Meaning and limits |
| --- | --- | --- |
| Public homepage over HTTPS | HTTP 200; Vercel; HSTS present | Frontend hosting works. |
| Public `/api/health`, `/api/crew`, `/api/ml/demo/crew-01` | HTTP 404 on all three | These backend routes are unavailable at the supplied origin. |
| Browser requests during tested interactions | No `/api/` requests | The tested deployed UI does not invoke the model or NASA adapter. |
| Backend tests, run from `backend/` | 11 passed | Existing backend behavior passes; these tests do not cover the current frontend. |
| Frontend clean dependency installation | `npm ci --ignore-scripts --no-fund --no-audit` succeeded | Initially installed dependencies were stale and lacked `react-toastify`; installation resolved that local build failure. |
| Frontend production build | Passed after installation | JS 282.30 kB / 86.87 kB gzip; CSS 43.73 kB / 9.43 kB gzip. |
| ESLint | Passed | Static lint checks did not detect the behavioral defects below. |
| npm dependency audit | Zero reported vulnerabilities | Advisory-based dependency check, not a full application security assessment. |
| Python environment | `pip check` passed | Tested Python 3.13.0, scikit-learn 1.6.1, NumPy 2.1.3, pandas 2.2.3, joblib 1.4.2. |
| Python advisory spot check | No OSV advisories returned for 18 checked installed packages | Covered direct dependencies and selected runtime dependencies; not a full transitive audit. |
| Model retraining | All 5,949 window scores matched exactly | Strong evidence that the committed model is reproducible from the local data and training script. |
| Model demo | All 126 crew/scenario/day combinations scored | All 42 nominal windows remained unflagged; sleep-debt and cardio scenarios flagged late in the synthetic timeline. |
| Local NASA DONKI request | Available; empty events list | The adapter successfully returned an empty reported-event result; no event was fabricated. |
| Mobile layout at 390 px | No horizontal page overflow | Fixed-height scrolling panels and long vertical layout still need usability improvements. |
| Automated accessibility check | 15 unlabeled sliders, unnamed scenario selector, 20 contrast failures, missing H1 | Browser automation results; manual assistive-technology testing remains necessary. |
| Offline reload of hosted application | Failed with `ERR_INTERNET_DISCONNECTED` | An already loaded simulation can run locally; an offline reload was not supported in the tested browser context. |
| GitHub automation | Zero workflow runs, no tracked workflow files, `main` unprotected, no rulesets returned | There is no evidenced automated quality gate for merges. |

**Priority definitions:** P1 blocks a trustworthy public demonstration of the affected feature. P2 is important for reliability, evaluation, or usability. P3 improves documentation and presentation.

1. **P1 — Replace the frontend's unsupported treatment instructions and show the prototype boundaries in the app.**

   `frontend/src/data.js:79` tells a user to take erythropoietin when the RBC slider enters either critical range. Line 86 gives antibiotic/antiviral instructions; other entries recommend supplements or fasting. In the live browser, moving RBC to its minimum displayed the EPO instruction in an alert. Those instructions come from hand-written threshold rules, not the trained model, and conflict with the README and science document's stated prohibition on prescribing treatment. The live interface also lacks their visible synthetic-data and nonclinical-use notices.

   Replace these commands with reviewed wording about verifying data, recording context, and following established medical escalation protocols. Show a persistent simulation label, data provenance, and the prototype's limits. A disclaimer alone does not resolve unsupported treatment content. Clearly label simulated actions: clicking “Medical check” currently only writes a log message, while “Medical response” changes synthetic numbers without any clinical process.

   Sources: [treatment strings](../frontend/src/data.js), [action handlers](../frontend/src/App.jsx), [science boundaries](SCIENCE.md).

2. **P1 — Deploy and connect the Python API; the public dashboard currently bypasses the trained model.**

   `frontend/src/App.jsx` derives its readings and status entirely from React state, `data.js`, and `status.js`. There is no API client or use of `VITE_API_URL`. Browser network inspection confirmed no API requests during the tested interactions. The live origin returns 404 for the health, crew, and model-demo routes. The current UI also uses different scenario IDs from the API and has no backend crew selection or 14-day model timeline.

   Add a shared API contract and render `/api/crew`, `/api/crew/{crew_id}`, and `/api/ml/demo/{crew_id}` results. Show the baseline assessment separately from the MMASH rarity percentile, including model version, input window, quality, and explanations. Include loading, failure, and model-unavailable states. Reconcile `normal/watch/review` with components currently expecting `normal/warning/critical` before passing statuses between them.

   `frontend/vite.config.js` has no API proxy, despite the README saying it does. `frontend/.env.example` documents a variable the app never reads. A local production-origin CORS preflight returned **400, “Disallowed CORS origin”**, because FastAPI currently permits only localhost origins. Use a same-origin API route/proxy or explicitly configure the deployed frontend origin.

   Vercel supports FastAPI; this is an application/deployment integration gap, not an inherent inability to host Python there. Retaining the existing frontend and deploying a Python service is a reasonable path. Verify the packaged NumPy/pandas/scikit-learn environment, model file inclusion, cold-start latency, and runtime memory before choosing the final setup. A container is another way to preserve the tested runtime. Exclude raw datasets and development-only dependencies from deployment.

   Sources: [frontend](../frontend/src/App.jsx), [Vite configuration](../frontend/vite.config.js), [FastAPI CORS](../backend/app/main.py), [integration contract](FRONTEND_INTEGRATION.md), [Vercel FastAPI documentation](https://vercel.com/docs/frameworks/backend/fastapi), [Vercel Python packaging](https://vercel.com/docs/functions/runtimes/python).

3. **P1 — Hazard aggregation hides critical readings.**

   `frontend/src/status.js:25` aggregates each hazard using `lowest()`. One normal associated metric therefore keeps the aggregate normal even when another metric is critical. On the live site, setting resting heart rate to **180 bpm** displayed a critical metric while **Space Radiation remained Normal**. This is reproducible without changing code.

   Define and test an explicit aggregation policy that preserves significant flags. For a group intended to show its most severe associated signal, use the maximum severity and handle missing inputs separately. Also distinguish illustrative symptom groups from environmental measurements: symptoms and lab counts alone do not measure space-radiation exposure or establish an environmental cause. Unknown or unmeasured conditions should have an explicit unknown state.

   Source: [status aggregation](../frontend/src/status.js). Evidence: [critical-heart screenshot](review-2026-11-15/critical-heart.png).

4. **P1 — Two blood-cell slider changes crash the entire page.**

   The isolation hazard references `igg` in `frontend/src/data.js:120`, but no metric with that ID exists. When both RBC and WBC become abnormal, the hazard status changes. `frontend/src/App.jsx:469–471` includes the undefined ID in its cause list and reads `metricById[mid].name`.

   Reproduction on the deployed application: reload, move RBC to its minimum, then move WBC to its minimum. Chrome reported **“Cannot read properties of undefined (reading 'name')”** and React's root became empty. The user receives a blank page.

   Remove or implement the missing metric, validate hazard-to-metric references, handle unknown IDs defensively, and add a regression test for this interaction. An error boundary can preserve a useful failure screen, but the invalid reference itself needs fixing.

   Sources: [hazard definition](../frontend/src/data.js), [cause-list construction](../frontend/src/App.jsx). Evidence: [browser results](review-2026-11-15/browser-results.json).

5. **P2 — Simulator HRV effects move opposite to its own warning rules.**

   The `stress` metric is labeled HRV RMSSD in milliseconds; its rules mark low values as worse. Radiation and isolation scenarios add `+1.5` to this value per simulated hour, moving it toward the app's normal range rather than toward a warning. Conversely, the exercise handler subtracts two while rest and medical-response handlers add values. This mixes a “stress level” concept with an HRV measurement.

   Define the variable and units consistently, then make the synthetic effects match that definition. In the browser, running the radiation scenario increased the HRV slider above its default. Physiological effect sizes remain illustrative and should be labeled and reviewed accordingly.

   Sources: [metric definition](../frontend/src/data.js), [scenario and action effects](../frontend/src/App.jsx).

6. **P2 — The simulation speed label is wrong by a factor of 60.**

   The control says “mission hours per second,” but `setElapsedMinutes(prev => prev + speed)` adds minutes each second. At 24x, one controlled second advanced the live clock to **Day 1 · 00:24**, not the 24 hours implied by the label. The effect update also divides by 60, matching minutes rather than the advertised hours.

   Choose one time unit and apply it to the clock, effects, label, and log. Log mission time as well as wall time so events can be traced to simulated conditions. Validate action inputs before applying them: an HTML number input's `min`/`max` alone does not constrain the value used by an ordinary button handler.

   Sources: [timer](../frontend/src/App.jsx), [speed label and action input](../frontend/src/components/Simulator.jsx).

7. **P2 — The model is reproducible, but its evaluation does not establish detection accuracy.**

   The pipeline uses seven features, median imputation, robust scaling, and a 300-tree Isolation Forest. The split is by participant: **16 training, 3 calibration, 3 test participants**. This is a sound protection against mixing adjacent windows from the same person across partitions. Rebuilding produced **4,285 training, 838 calibration, and 826 test windows**, identical calibration scores, and exactly identical model scores for every local window.

   At the 99th-percentile threshold, **5/826 held-out windows were flagged (0.605%)**. Per-person counts were 1/281, 2/276, and 2/269. These are alert-rate measurements on healthy reference recordings. They are not accuracy, sensitivity, disease probability, or a validated false-positive estimate against labeled clinical outcomes. A score of 1.0 means the raw rarity score exceeds the calibration sample, not certainty of illness.

   MMASH covers about 24 hours from 22 healthy young adult men on Earth. It does not validate astronaut, microgravity, clinical-event, or multiweek performance. The current model also does not use the UI's microbiome, blood-cell, vision, or bone-loss sliders. `crew_id` does not personalize the Isolation Forest; the separate synthetic daily baseline layer provides the project's personalization.

   Next evaluation work: repeated participant-level splits or grouped cross-validation; per-person/activity/time-of-day alert rates; labeled anomaly detection where suitable labels exist; explicitly labeled synthetic perturbation benchmarks; noise, dropout, device-scale, and time-zone tests; and an alert-rate versus detection-delay analysis for threshold selection. Compare against a transparent baseline method. Account for correlation between adjacent windows when reporting uncertainty. Keep a final evaluation set separate from any tuning of scenarios or thresholds.

   The daily baseline engine evaluates each day independently. Add persistence, hysteresis, acknowledgment, and trend logic before describing the alerting itself as trend-aware. Preserve the existing distinction between feature-reference deviations and actual model attribution.

   Sources: [training pipeline](../backend/scripts/train_mmash.py), [metadata](../backend/models/mmash_iforest_v1.metadata.json), [runtime](../backend/app/ml.py), [daily baseline](../backend/app/simulator.py), [MMASH's primary dataset description](https://physionet.org/content/mmash/1.0.0/).

8. **P2 — Data-quality validation can count repeated timestamps as valid coverage.**

   `backend/scripts/train_mmash.py:118–131` counts rows rather than distinct expected seconds. A controlled fixture containing **180 copies of one timestamp** was accepted as a five-minute window with **60% coverage**, although it represented only one unique second. This did not affect the reviewed local MMASH data: none of its participant Actigraph files contained duplicate `(day, time)` pairs.

   Validate and deduplicate timestamps before aggregation and compute coverage against expected epochs. Add quality checks for movement/posture inputs and define whether a submitted timestamp represents the start or midpoint of a window: training uses the midpoint for time-of-day features. The runtime currently accepts a caller-supplied heart-rate coverage fraction, which should be calculated and verified by a real ingestion adapter. Record sensor type and units. Attach data checksums and the training-code revision to model releases.

   Source: [window preprocessing](../backend/scripts/train_mmash.py).

9. **P2 — Fix accessibility and theme conflicts before further visual polish.**

   The desktop Chrome scan found **15 sliders without accessible names**, an unnamed scenario selector, **20 color-contrast failures**, and no H1. `Body.jsx` uses clickable SVG groups without keyboard interaction. The page's main headings render nearly black on a dark panel in a browser using light color preference: the inherited starter CSS sets `--text-h: #08060d` and overrides the intended design. The measured heading contrast was approximately **1.13:1**.

   Associate every input with a visible label, expose meaningful accessible values and units, make body selection keyboard-operable, give the page an H1, and reconcile the starter CSS with the dark dashboard. Add a reduced-motion option. Both mobile and desktop screenshots show the theme issue. On mobile, the fixed-height metrics list also requires scrolling inside a panel after scrolling the overall page; prioritize current status and key readings above simulator configuration and decoration.

   Sources: [metric inputs](../frontend/src/components/MetricsPanel.jsx), [scenario control](../frontend/src/components/Simulator.jsx), [body interaction](../frontend/src/components/Body.jsx), [theme CSS](../frontend/src/index.css). Evidence: [desktop](review-2026-11-15/desktop.png), [mobile](review-2026-11-15/mobile.png), [automated results](review-2026-11-15/browser-results.json).

10. **P2 — Clarify and implement the desired offline and persistence behavior.**

    The loaded frontend runs a local simulator, but state and logs exist only in memory. A fresh offline reload failed in the tested browser context, and there is no service worker or persistent storage implementation. Running an already installed local FastAPI service without internet is a separate capability and remains possible; it should not be conflated with offline operation of the hosted app.

    For the web demo, cache the app shell if offline reopening is required and persist simulation/check-in/log state with explicit reset/export controls. Show stale and unavailable states for external data. If model inference must work aboard an offline device, provide a packaged local backend or evaluate a browser-compatible model runtime. Preserve provenance if demo and actual sensor modes are added later.

    Sources: [React state and logs](../frontend/src/App.jsx), [entrypoint](../frontend/src/main.jsx), tracked file inventory. Evidence: [offline browser result](review-2026-11-15/browser-results.json).

11. **P2 — Health checks should report model readiness and deployed version.**

    With the model path deliberately pointed at a nonexistent file in an isolated test process, `/api/health` still returned HTTP 200 and `status: ok`, while `/api/ml/demo/crew-01` returned 503. A deployment monitor using only the health route would miss a broken model installation.

    Keep a simple liveness endpoint and add readiness that validates the artifact, feature schema, versions, and a small inference check. Expose application revision and model version/digest. Lock the deployment's Python runtime and dependencies, and test that exact environment. The runtime caches artifacts by path, so model replacement needs an explicit rollout/restart or cache invalidation policy. Only load trusted artifacts; joblib is pickle-based, and scikit-learn documents the execution and environment-compatibility implications.

    Sources: [health endpoint](../backend/app/main.py), [artifact loading/cache](../backend/app/ml.py), [requirements](../backend/requirements.txt), [scikit-learn persistence guidance](https://scikit-learn.org/stable/model_persistence.html).

12. **P2 — Finish the NASA adapter's operational behavior and surface it in the frontend.**

    The local adapter successfully called DONKI and correctly returned an empty event list. Its offline test also passes. This is a useful foundation, and the distinction between event reports and astronaut dose is correctly documented. The deployed UI currently never calls this endpoint.

    Add caching, retrieval timestamps, explicit empty/stale/unavailable presentation, and request-rate protection before exposing an uncached external lookup publicly. Validate each upstream event object, not only the top-level list. Configure the key in the hosting environment; simply copying `backend/.env.example` to `.env` does not load it under the documented plain `uvicorn` command. Keep credentials on the server and avoid implying that SEP reports quantify crew exposure.

    Sources: [NASA adapter](../backend/app/main.py), [configuration example](../backend/.env.example), [current tests](../backend/tests/test_simulator.py).

13. **P2 — Add automated integration and release checks.**

    GitHub returned zero workflow runs, no rulesets, and an unprotected `main` branch. There are 11 useful backend tests but no frontend test command or browser regression suite in the repository. The serious live crash and hidden-hazard behavior both pass the existing build and lint checks.

    Add CI for backend tests, clean frontend installation, lint, production build, and a small set of user-flow tests covering critical readings, hazard aggregation, invalid references, scenario/time behavior, and API failure states. Include preprocessing data-quality regressions and model-loading failures. Require these checks on pull requests. Run post-deploy smoke checks against the actual API and record the source/model versions used for release and rollback.

    The public homepage provided HSTS, but the inspected response did not provide CSP, frame-embedding protection, a referrer policy, or `X-Content-Type-Options`; add suitable headers for the final deployment. No production health-data store, authentication, or authorization implementation is present. If real records are introduced, define access, local storage protection, retention, consent, and auditing before ingesting them; these are not required to browse the current synthetic demo.

    Sources: GitHub repository/branch/workflow/ruleset reads; [tests](../backend/tests), [package scripts](../frontend/package.json), live response headers.

14. **P3 — Align the README, presentation, and repository metadata with the delivered product.**

    The README describes React 18 with vanilla CSS, a crew/day dashboard, a NASA-load control, and a working Vite API proxy. The current manifest uses React 19 and Tailwind, and the deployed UI is a different simulator. The browser title remains `nasa-health-monitoring-app`, and the site does not prominently identify AstroPulse or InfinityDz. The repository has no software license, homepage, or description in the metadata returned during review.

    Update the walkthrough and installation/deployment instructions after integration, add the public URL, document the supported Node/Python versions, give the app a product title and concise introduction, choose a software license, and retain the MMASH citation/license information and AI-use acknowledgment. The official challenge page returned an access error during this review, so competition-specific deadlines and submission rules in the docs were not independently confirmed.

    Sources: [README](../README.md), [package manifest](../frontend/package.json), [HTML title](../frontend/index.html), [submission notes](SUBMISSION.md).

The recommended implementation order is: resolve findings 1, 3, and 4; connect and deploy the API in finding 2; correct simulator behavior and readiness; add the regression checks; then improve evaluation, offline behavior, accessibility, and presentation. Public acceptance should include a successful model API call from the deployed page, consistent visible statuses, no crash in the blood-cell reproduction, safe alert wording, clear data labels, and passing automated checks.

**Reproduction commands and review scope.** From `backend/`, run `..\.venv\Scripts\python.exe -m pytest -q`. From `frontend/`, run `npm ci --ignore-scripts --no-fund --no-audit`, `npm run build`, `npm run lint`, and `npm audit --json`. The root-level virtual environment was used for this review; a newly created environment inside `backend/` would use its own interpreter path. An initial root-directory pytest invocation could not import `app`; the documented backend-directory invocation passed.

The model was rebuilt in memory using `build_dataset()` and `train_model()` without overwriting the committed artifact. Every generated score and calibration value was compared with the committed model. This verifies reproducibility against the local downloaded files; the original publisher's archive checksum and medical labels were not independently verified. Public hosting checks used ordinary HTTP requests and client-side browser interactions. There was no load test, penetration test, private Vercel account inspection, production log review, wearable validation, or medical/flight qualification. These checks cannot establish uptime history, billing, deployment account settings, or clinical safety.

Review evidence is saved in [review-2026-11-15](review-2026-11-15/). Browser tests changed only ephemeral client state. No issue, pull request, or message was published on GitHub.
