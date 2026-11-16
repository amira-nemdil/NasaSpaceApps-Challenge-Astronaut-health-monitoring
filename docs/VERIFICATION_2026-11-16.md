# AstroPulse verification — 16 November 2026

Application: **[Open AstroPulse](https://astronaut-health-monitoring-nasa-app-infinitydz.vercel.app/)**.

The reviewed local and GitHub base was `cca7592962aff24518d458b2833e7476dfdc672a` (`astronaut icon`), which includes the earlier implementation commit. This verification found and corrected committed merge conflicts before rerunning the application checks. No production deployment was performed.

The merge left conflict markers in `frontend/src/data.js` and `frontend/index.html`. This made ESLint fail, duplicated metric definitions, and included the old unsupported treatment advice in the conflicting version. The JavaScript conflict was resolved to the previously verified safe definitions; the page kept AstroPulse metadata and the new astronaut image, with its favicon MIME type corrected to `image/png`.

`scripts/check_conflicts.py` now checks tracked and unignored repository files, including HTML. It detected all six conflict-marker lines before the repair and passes afterward. CI runs it before dependency installation so unresolved merges fail with an explicit filename and line number. The README now places the public app link immediately below the title and includes a dated hosting-status notice.

| Check | Current result |
| --- | --- |
| Conflict-marker scan | Passed after the repair |
| Python backend suite | 20 passed |
| Frontend unit suite | 6 passed |
| Browser suite against the real local backend/model | 7 passed |
| Clean frontend installation | Passed with `npm ci --ignore-scripts` |
| ESLint | Passed |
| Production frontend build | Passed |
| npm advisory audit | Zero reported vulnerabilities |
| Python dependency consistency | `pip check` passed |
| Python OSV advisory spot check | No advisories returned for 18 checked installed packages; not a full transitive/security audit |
| Desktop/mobile accessibility | No automated violations in the existing browser test at 1440 px and 390 px |
| Offline reload and cached-result labeling | Passed in the browser suite |
| Critical alert and blood-cell crash regressions | Passed |
| Model-scenario/day API integration | Passed |
| Missing model/API and unavailable NASA presentation | Passed |
| HTML title, manifest and astronaut icon | One correct AstroPulse title, manifest present, bundled icon verified as PNG |
| Vercel configuration | Matches the current published configuration field rules; no authenticated preview build performed |
| Container image | Not built; Docker is unavailable in this workspace |

The backend suite still emits a Starlette deprecation warning about its httpx test-client integration. It does not fail the tests. These local results do not imply that a GitHub Actions run or production deployment has passed.

The committed model was rebuilt in memory from the 22 local MMASH participants. All **5,949 model scores** and all calibration values match exactly, with a maximum score difference of **0.0**. The artifact SHA256 is `7a1650ee53cc5abf01be71c16912696ff4471d7dd7e22fc432258b6dbb396e36`.

The five participant-split evaluations were rerun into a temporary output, without overwriting the model or existing evaluation record. Every run and source-file checksum matches [model-evaluation.json](model-evaluation.json). Reference alert rates remain approximately **0.61%, 1.13%, 1.03%, 5.04%, and 0.24%**. These are reference alert rates, not medical accuracy or clinical validation.

The latest inspected [GitHub Actions run](https://github.com/amira-nemdil/NasaSpaceApps-Challenge-Astronaut-health-monitoring/actions/runs/43791751574) failed on the base commit. Its log confirms `frontend/src/data.js:1:2`, `Parsing error: Unexpected token <<`. The local conflict repair resolves that error. A new successful remote run still requires publishing this repair and running the workflow. `main` remains unprotected in the inspected branch metadata.

The public homepage returns **HTTP 200**, but all of these requests still return **HTTP 404**:

- `/api/health`
- `/api/ready`
- `/api/ml/demo/crew-01?scenario=sleep_debt`

The public site therefore cannot be verified as the integrated model-serving release. Check the existing Vercel project's repository root/framework/build settings and deploy the prepared root configuration, following [DEPLOYMENT.md](DEPLOYMENT.md). Then repeat readiness and browser checks against the production origin. Private hosting settings, logs, costs and uptime history were not inspected; the hosting account is not connected here.
