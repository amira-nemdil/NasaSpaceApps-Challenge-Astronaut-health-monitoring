# AstroPulse — InfinityDz

**[Open the AstroPulse app](https://astronaut-health-monitoring-nasa-app-infinitydz.vercel.app/)**

An educational NASA Space Apps astronaut-health monitoring prototype with a React 19/Tailwind interface, FastAPI service, and a reproducible MMASH Isolation Forest.

**All crew identities, mission readings, thresholds, and action effects are synthetic or illustrative. This is not a medical device, is not clinically validated, and must not guide medical treatment or flight-safety decisions. NASA does not endorse this project.**

**Public hosting status, verified 16 November 2026:** the homepage is reachable, but `/api/health`, `/api/ready`, and the model-demo route return HTTP 404. The hosted release does not yet expose the backend. Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md) to deploy the repository-root frontend/API configuration, then verify readiness before claiming the model is live.

## What the app does

- **Mission health:** select one of three synthetic crew members, a `nominal`, `sleep_debt`, or `cardio_stress` scenario, and a mission day. The frontend requests actual baseline and trained-model results from FastAPI. It shows statistical rarity, threshold, quality, model version, reference deviations, and input data separately from daily baseline assessments.
- **Interactive sandbox:** explore 15 illustrative signals, body regions, group flags, time acceleration, and simulated actions. This sandbox uses transparent thresholds and is independent of the trained model. Groups are not measurements of radiation dose or environmental hazards. Significant signals remain visible when another group member is normal.
- **NASA context:** optionally request real DONKI SEP event metadata. Requests are cached with explicit empty, unavailable, and stale states. Reports do not estimate crew exposure.
- **Local continuity:** the production app shell can reopen offline after a successful online visit. Previously fetched synthetic mission results are clearly marked as saved; they are not new offline inference. Sandbox values, paused clock, review acknowledgments, and the latest 200 log entries persist on the device. Sessions can be exported or cleared. This storage is not suitable for real medical records.

## Run locally

Use **Python 3.13** and **Node 22.12+** (Node 24 also works). Runtime package versions match the existing trained model. From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm --prefix frontend ci
npm --prefix frontend run build
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `.venv/bin/python` in place of `.venv\Scripts\python.exe`. Open http://127.0.0.1:8000. API specification: `/docs`; liveness: `/api/health`; model readiness and release identity: `/api/ready`.

For frontend hot reload, run `npm --prefix frontend run dev` in a second terminal and open http://localhost:5173. Vite proxies `/api` to port 8000. `VITE_API_URL` can override the origin for development; production defaults to same-origin API calls. Build-time URL changes require a rebuild, and custom cross-origin production hosting also needs matching CSP and CORS settings.

Copy `backend/.env.example` to `backend/.env` for optional settings; FastAPI loads this file without overriding hosting-provided environment values. `NASA_API_KEY` increases the optional NASA feed quota. Never place secrets in `VITE_*` variables. `ASTROPULSE_CORS_ORIGINS` is a comma-separated explicit origin list. `ASTROPULSE_MODEL_SHA256` optionally enforces the trusted artifact's SHA256; `ASTROPULSE_MODEL_PATH` selects a trusted local model file.

## Verification

```powershell
.\.venv\Scripts\python.exe scripts/check_conflicts.py
.\.venv\Scripts\python.exe -m pytest -q
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
cd frontend
npx playwright install chromium
npm run test:e2e
```

Browser tests start the unified app on port 8011. Set `PYTHON_EXECUTABLE` if your interpreter is elsewhere. For an existing Chrome installation, set `PLAYWRIGHT_CHROME_EXECUTABLE` to its executable path. CI installs Chromium and runs the same checks on Linux. No raw participant records are required for application tests; the trusted model is committed.

## Training and evaluation

Download [MMASH v1.0.0](https://physionet.org/content/mmash/1.0.0/) into the local, gitignored layout in [data/README.md](data/README.md).

```powershell
.\.venv\Scripts\python.exe backend/scripts/train_mmash.py
.\.venv\Scripts\python.exe backend/scripts/evaluate_mmash.py
```

The trainer uses non-overlapping five-minute windows and distinct participant train/calibration/test partitions. Coverage counts unique one-second timestamps. New releases record source-file and training-script hashes. The runtime reloads a replaced artifact when its file signature changes; release checksums can pin a trusted deployment.

The model uses seven wearable/time features. It does not score blood counts, microbiome, vision, or bone-loss sliders. Sleep, fatigue, and mood belong to the separate daily baseline layer. Those assessments compare each day independently; persistence and clinical trend detection are not claimed.

[Repeated evaluation results](docs/model-evaluation.json) cover five participant splits. Reference alert rates range from approximately **0.24% to 5.04%** at a 99th-percentile threshold. An extreme artificial perturbation benchmark flags all injected windows in these runs; this is not clinical accuracy. MMASH contains approximately 24 hours from 22 healthy young adult men on Earth and cannot establish astronaut or medical-event performance. See [SCIENCE.md](docs/SCIENCE.md) for sources, limitations, and the distinction between feature-reference deviations and model attribution.

## Project documentation

- [Latest verification: 16 November 2026](docs/VERIFICATION_2026-11-16.md)
- [Implementation status and remaining limits](docs/IMPLEMENTATION_STATUS.md)
- [Deployment and post-deploy verification](docs/DEPLOYMENT.md)
- [API contract](docs/API.md) and [frontend integration](docs/FRONTEND_INTEGRATION.md)
- [Original review and evidence](docs/PROJECT_REVIEW_2026-11-15.md), preserved as a record of the earlier release
- [Team and collaboration](docs/TEAM.md), [submission notes](docs/SUBMISSION.md)

The software license remains a team decision; no new reuse license has been granted. Preserve the MMASH citation and its separate dataset-license notices.

## Credits and AI assistance

AstroPulse is by InfinityDz. Team contributions and responsibilities should be recorded in [TEAM.md](docs/TEAM.md). The starter and subsequent implementation/review work used ChatGPT/Codex (OpenAI) assistance. Team members must review the code, scientific statements, and final competition submission and disclose assistance under applicable event rules. NASA data, where loaded, comes from the official DONKI service; simulated crew telemetry does not come from NASA.
