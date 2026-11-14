# AstroPulse API contract

FastAPI runs locally on `http://127.0.0.1:8000`. Interactive specification: `/docs`.

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Service status and `synthetic: true` |
| GET | `/api/crew?scenario=nominal` | Three fictitious crew profiles and day-14 prototype status |
| GET | `/api/crew/crew-01?scenario=sleep_debt` | Crew info, baseline, 14-day simulated telemetry + review drivers |
| GET | `/api/space-weather` | Optional NASA DONKI SEP event report metadata |

Scenario values: `nominal`, `sleep_debt`, `cardio_stress`.

Important keys for the individual crew endpoint:

```json
{
  "crew": { "id": "crew-01", "name": "Dr. Maya Reyes", "role": "Mission commander" },
  "scenario": "sleep_debt",
  "data_source": "Synthetic telemetry generated locally (not NASA astronaut measurements)",
  "baseline_days": [1, 7],
  "baselines": {
    "heart_rate": { "mean": 63.1, "std": 3.0 },
    "sleep_hours": { "mean": 7.6, "std": 0.4 }
  },
  "timeline": [
    {
      "day": 1,
      "heart_rate": 64.5,
      "sleep_hours": 7.85,
      "fatigue": 2.2,
      "mood": 4.6,
      "status": "normal",
      "score": 0.5,
      "drivers": [],
      "advice": "No significant deviation in this illustrative model; continue regular monitoring.",
      "is_clinically_validated": false
    }
  ],
  "last_day": { "day": 14, "status": "review" }
}
```

This example is **illustrative and abbreviated**, not an exact captured endpoint payload; the response includes 14 full records. Inspect `/docs` or `curl` the running service for exact data.

`/api/space-weather` returns `available`, `events`, `window`, `data_source`, and `important`. If NASA is unreachable, it returns `available: false` and `events: []`; **no fabricated live events**.

## Testing

```bash
cd backend
python -m pytest -q
```
