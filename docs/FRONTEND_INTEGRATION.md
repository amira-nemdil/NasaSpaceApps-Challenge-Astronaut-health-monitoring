# Frontend integration for the model demo

The React application never loads the `.joblib` file. FastAPI owns the model; React requests JSON and renders the response.

## Start both services

Run the API from the repository root:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir backend --reload --port 8000
```

Create `frontend/.env.local`:

```text
VITE_API_URL=http://127.0.0.1:8000
```

Then start React from `frontend/` with `npm run dev`.

## Fetch a complete synthetic timeline

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function getModelDemo(crewId, scenario) {
  const response = await fetch(
    `${API_URL}/api/ml/demo/${crewId}?scenario=${scenario}`,
  )
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.detail || 'Unable to load the model demo')
  }
  return body
}
```

The frontend can fetch once whenever the crew member or scenario changes, store `body.timeline`, and select the item matching the current mission-day slider.

Render these fields:

- `item.overall_status`: primary `normal`, `watch`, or `review` badge;
- `item.model_output.anomaly_score * 100`: statistical-rarity percentile;
- `item.model_output.drivers`: wearable-model explanations;
- `item.baseline_assessment.drivers`: sleep, fatigue, mood, and daily-baseline explanations;
- `item.model_output.data_quality`: sensor-window quality indicator; and
- top-level `synthetic`, `data_source`, and `disclaimer`: keep these visible in the demo.

The input is already included as `item.model_input`; Anis does not need to invent or manually enter sensor values. For direct scoring of a future real or externally simulated five-minute window, use `POST /api/ml/score` with the contract in [`API.md`](API.md).
