# AstroPulse frontend

React 19, Vite, Tailwind CSS, and React Toastify. Run `npm ci`, then `npm run dev` with the FastAPI backend on port 8000. The development server proxies `/api` to that backend.

`MissionHealth.jsx` renders FastAPI crew/baseline/model results; `SpaceWeather.jsx` renders optional NASA reports; `App.jsx` and `simulation.js` own the independent illustrative sandbox. The model artifact is never loaded in the browser. `storage.js` stores synthetic demo state only. The production service worker caches the static app shell; API snapshots are saved explicitly and labeled stale when reused.

Checks: `npm run lint`, `npm test`, `npm run build`, then `npm run test:e2e`. Browser tests use the built frontend and the real local model service. Install Chromium with `npx playwright install chromium` or set `PLAYWRIGHT_CHROME_EXECUTABLE` to an existing Chrome binary.

See the [root README](../README.md) and [deployment guide](../docs/DEPLOYMENT.md) for the complete application.
