# AstroPulse API contract

FastAPI runs locally on `http://127.0.0.1:8000`. Interactive specification: `/docs`.

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Service status and `synthetic: true` |
| GET | `/api/crew?scenario=nominal` | Three fictitious crew profiles and day-14 prototype status |
| GET | `/api/crew/crew-01?scenario=sleep_debt` | Crew info, baseline, 14-day simulated telemetry + review drivers |
| GET | `/api/space-weather` | Optional NASA DONKI SEP event report metadata |
| POST | `/api/ml/score` | Score one five-minute wearable window with the optional MMASH Isolation Forest |
| GET | `/api/ml/demo/crew-01?scenario=cardio_stress` | Generate and score a hardware-free, synthetic 14-day model demo |

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

## MMASH model scoring

`POST /api/ml/score` accepts one summarized five-minute sensor window. The backend derives logarithmic activity features and cyclic time-of-day features before applying the saved preprocessing and Isolation Forest pipeline.

```json
{
  "crew_id": "crew-01",
  "timestamp": "2026-11-15T10:35:00Z",
  "window_minutes": 5,
  "heart_rate_mean_bpm": 84.1,
  "heart_rate_std_bpm": 6.3,
  "activity_vector_magnitude_mean": 18.6,
  "steps": 12,
  "lying_fraction": 0.0,
  "valid_heart_rate_fraction": 0.96
}
```

Example response:

```json
{
  "model_version": "mmash-iforest-v1",
  "window_minutes": 5,
  "anomaly_score": 0.4415,
  "threshold": 0.99,
  "is_anomaly": false,
  "status": "normal",
  "feature_values": {
    "heart_rate_mean_bpm": 84.1,
    "heart_rate_std_bpm": 6.3,
    "activity_vector_magnitude_mean": 18.6,
    "steps": 12,
    "lying_fraction": 0.0
  },
  "drivers": [],
  "data_quality": {
    "valid_heart_rate_fraction": 0.96,
    "accepted": true,
    "minimum_required": 0.6
  },
  "explanation_method": "Held-out reference percentile plus robust feature deviations; not Isolation Forest feature attribution",
  "is_clinically_validated": false
}
```

`anomaly_score` is the percentile rank of statistical rarity against held-out MMASH reference windows. It is not a disease probability. The model returns only `normal` or `watch`; it cannot independently trigger a medical-review state. A missing model artifact produces an unavailable-service response until `python backend/scripts/train_mmash.py` has completed.

## Hardware-free model demo

`GET /api/ml/demo/{crew_id}?scenario=nominal|sleep_debt|cardio_stress` requires no physical sensor. It returns 14 deterministic, explicitly synthetic five-minute inputs scored by the real trained model. Each timeline item contains:

```json
{
  "mission_day": 14,
  "model_input": {
    "crew_id": "crew-01",
    "timestamp": "2026-11-14T10:35:00Z",
    "window_minutes": 5,
    "heart_rate_mean_bpm": 115.3,
    "heart_rate_std_bpm": 20.1,
    "activity_vector_magnitude_mean": 2.4,
    "steps": 1,
    "lying_fraction": 0.19,
    "valid_heart_rate_fraction": 0.98
  },
  "model_output": {
    "anomaly_score": 1.0,
    "is_anomaly": true,
    "status": "watch",
    "drivers": []
  },
  "baseline_assessment": {
    "status": "review",
    "score": 4.0,
    "drivers": []
  },
  "overall_status": "review"
}
```

Values above are abbreviated examples. Use the returned JSON rather than hard-coding them. The ML layer can raise only `watch`; `overall_status` becomes `review` only when the separate transparent baseline layer does. Every demo response includes `synthetic: true`, its data source, and a non-clinical disclaimer.

## Testing

```bash
cd backend
python -m pytest -q
```
