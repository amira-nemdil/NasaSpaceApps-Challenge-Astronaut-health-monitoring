# Frontend/model integration

The integration is implemented in `frontend/src/components/MissionHealth.jsx` and `frontend/src/api.js`. React never loads the joblib artifact. FastAPI returns the scored model results and the independent daily baseline assessment.

The crew roster is requested from `/api/crew`. Each crew/scenario selection requests `/api/crew/{crew_id}` and `/api/ml/demo/{crew_id}`. The day control selects the corresponding timeline item. Abort signals prevent a response from an obsolete selection replacing a newer one. API URLs default to the current origin; `VITE_API_URL` is a build-time development override.

The combined primary status uses the API's `normal/watch/review` vocabulary and is unavailable when a complete live or explicitly saved assessment cannot be obtained. The baseline and model panels remain distinct. Model errors do not hide a successfully loaded baseline or fabricate a model score. The sandbox's `normal/warning/critical` states are local illustrative thresholds and never overwrite the mission assessment.

Saved synthetic responses are keyed by API origin, crew, scenario and route. When the service is unavailable, a matching saved response can be displayed with its original retrieval time and an explicit cached-result label. Offline mode does not run fresh inference. The app-shell service worker excludes `/api` paths.

The record-review action stores an acknowledgment locally without clearing flags or sending a medical message. The NASA panel separately loads `/api/space-weather` and distinguishes a valid empty result, an unavailable feed and stale reports.

Use the regression tests in `frontend/tests/e2e/app.spec.js` to verify real backend requests, scenario/day changes, model failures, cached offline results and accessible controls.
