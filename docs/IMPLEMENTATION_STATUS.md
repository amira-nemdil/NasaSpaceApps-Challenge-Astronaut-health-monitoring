# Changes following the AstroPulse review

The original review describes the earlier source/deployed release and is preserved unchanged. The current source implements the fixes below. A new public deployment still needs authenticated hosting access and verification.

| Review issue | Current implementation |
| --- | --- |
| Unsupported treatment instructions | Removed from active frontend data. Alerts use verification/escalation wording; synthetic-data and nonclinical-use boundaries are visible. Simulated check-ins and local review requests do not claim a medical examination or a sent message. |
| Hidden critical group flags | Maximum known severity is preserved; missing inputs can produce an unknown state. Groups describe illustrative signals, not measured environmental hazards. |
| Missing `igg` crash | Removed the invalid reference and tested both blood-count sliders. A top-level error boundary preserves a useful failure screen. |
| Disconnected model | Implemented crew/scenario/day controls and actual baseline/model API requests. Model version, rarity percentile, quality, feature-reference explanations and inputs are visible. Partial/failed API responses do not fabricate normal model states. |
| Missing production API | Added unified frontend/API entrypoint, Vercel configuration, model-ready health check and optional container packaging. The remote project must use the repository root and be redeployed. |
| Clock and HRV inconsistencies | Clock/effects now use the advertised mission-hours-per-second unit; stress scenarios lower the RMSSD variable. Action inputs are validated, and physiological effects remain explicitly illustrative. |
| Accessibility/theme | Removed conflicting starter theme, added H1, labeled inputs, keyboard body selection, contrast improvements and reduced-motion support. Desktop/mobile automated checks pass. |
| Offline continuity | App shell caches after a successful online visit; cached model results have saved timestamps and no fresh-inference claim. Synthetic sandbox state/logs and review acknowledgments persist locally. Export/reset controls are available. |
| Incorrect model readiness | `/api/ready` runs an inference and returns 503 for unavailable/incompatible model releases; `/api/health` remains liveness. Response includes revision/model identity. |
| Timestamp/data quality | Duplicate timestamps cannot fabricate training coverage. Requests require an offset-aware midpoint timestamp and finite numeric inputs. New training metadata includes source and script hashes. |
| Model-release cache | Artifact cache is keyed by file modification time and size; optional configured SHA256 checks enforce release integrity. |
| NASA adapter operations | Added schema validation, retrieval timestamps, success/failure caching and explicit stale fallback. Optional `.env` values are loaded without overriding deployment environment settings. |
| Missing quality gates | Added backend reliability tests, frontend unit and browser tests, and a GitHub Actions workflow. Branch protection remains a separate repository administration setting. |
| Documentation | Updated actual architecture, runtime requirements, local commands, deployment steps, integration contract and scientific interpretation. |

The repeated MMASH evaluation in [model-evaluation.json](model-evaluation.json) uses five participant splits and a transparent deviation baseline. Reference alert rates vary from about 0.24% to 5.04%. The extreme artificial perturbation benchmark is fully flagged in those runs, but it has no disease labels. This adds evaluation evidence; it does not establish clinical accuracy, astronaut generalization, device calibration, multiweek prediction or real-record security readiness. Those require appropriate data, expert review and further validation. A software license also remains a team decision.

Current local previews: [desktop](implementation-preview-desktop.png) and [mobile](implementation-preview-mobile.png). They show the sleep-debt scenario scored by the real local model service.

Validation performed locally: 20 backend tests, 6 frontend unit tests, and 7 browser tests, plus lint and production build. Browser tests use the real trained model and verify offline reload, API failure states, critical alerts, the blood-cell crash regression, timing/HRV behavior, NASA failure presentation and accessibility at desktop/mobile sizes. The workflow itself must run on GitHub after publication; container and Vercel preview builds need their respective runtimes/accounts.
