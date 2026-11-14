[README.md](https://github.com/user-attachments/files/34847307/README.md)
# AstroPulse — by InfinityDz 🚀

> **NASA Space Apps Challenge 2026** · *Create Health Monitoring Software for Astronauts on Space Missions*

**An offline-friendly, explainable astronaut health monitoring prototype.** AstroPulse tracks a simulated 14-day mission, compares readings with each crewmember's personal baseline, flags changes worth reviewing, explains the signals, and optionally retrieves real NASA DONKI **space-weather event reports** (not astronaut radiation doses).

**This is a hackathon prototype, not a medical device.** All crew identities, vital signs, mission scenarios, and monitoring thresholds are **synthetic/illustrative**. The system does not diagnose disease, prescribe treatment, estimate radiation dose, or make flight-safety decisions. NASA is not affiliated with or endorsing this project.

## Why this project?

NASA's challenge asks for software that **gathers health indicators and enables astronauts to evaluate and act on health status**, particularly during long-duration missions. AstroPulse focuses on three demonstrable capabilities:

1. **Personalized baselines** rather than blindly applying terrestrial thresholds to astronauts.
2. **Explainable, trend-aware alerts** and careful, non-clinical follow-up prompts.
3. **Crew-facing, offline-friendly workflow** with optional NASA space-weather context.

**Demo scenarios:** `nominal`, `sleep_debt`, and `cardio_stress`. Every reading is deterministic, so the demo works without wearables, NASA access, or internet after dependency installation.

## Technology

- **Frontend:** React 18 + Vite + vanilla CSS (responsive, no external component library)
- **Backend:** Python 3.10+ + FastAPI (local, deterministic simulation)
- **Monitoring engine:** statistical anomaly scores over each astronaut's **first seven days** of data; no trained clinical model or falsely claimed medical accuracy
- **Optional real NASA data:** NASA DONKI SEP event metadata through the official NASA Open API (live internet and availability required)

## Quick start

Start each service from a separate terminal.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. For alternate API URLs set `VITE_API_URL` (see `frontend/.env.example`). The Vite dev server proxies `/api` to port `8000` by default.

### 3. Tests

```bash
cd backend
python -m pytest -q
```

## Live walkthrough (90 seconds)

1. Open **Mission Health** with a crew member selected; point out the **synthetic data** label.
2. Select `Nominal` → readings stay near personal baseline.
3. Select `Sleep debt` → move **mission day** slider from day 7 to day 14 → see fatigue/sleep/heart rate shift and transparent explanation.
4. Select `Cardio stress` → show a different scenario, not a clinical diagnosis.
5. Select `Load NASA space weather` → show **actual event metadata** if the feed is available. If unavailable, the dashboard honestly says so; it never fabricates real NASA data.
6. Explain how a future wearable/sensor feed would replace the simulator.

## Folders

```text
backend/
  app/main.py           # FastAPI routes and NASA DONKI adapter
  app/simulator.py      # synthetic mission telemetry and baseline logic
  tests/                # scenario and API tests
frontend/
  src/App.jsx           # dashboard, scenario and mission day controls
  src/styles.css        # responsive styling
  package.json
  vite.config.js
docs/
  TEAM.md               # responsibilities, workflow and remote participation
  SCIENCE.md            # limitations, credible references and methodology
  API.md                # documented response shapes
  SUBMISSION.md         # 48h checklist and suggested short demo
```

## Team: InfinityDz

| Person | Proposed focus |
|---|---|
| Amira Nemdil | AI / anomaly detection / methodology |
| Ferkous Lina Darine | Medical literature and clinical-safety wording |
| Anis Belil | Architecture, React integration, deployment |
| Douaa Khouni | UI/UX, design system, frontend |
| Djawad Benzira | APIs, data model, integration tests |
| Fettous Yousra Lyna | Sensor pathways, constraints and QA |

These are **suggested roles** to confirm with the team, not pre-agreed assignments. See [`docs/TEAM.md`](docs/TEAM.md).

## Sources and appropriate claims

- [Official 2026 challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
- [NASA Human Research Program](https://www.nasa.gov/hrp/) — mission health research context
- [NASA Open Science Data Repository](https://osdr.nasa.gov/) — research studies; **not** the simulator's data source
- [NASA DONKI API](https://api.nasa.gov/) — optional real reported solar energetic particle *events*, **not** crew dose/health impact
- [NASA Space Apps discussion on available data](https://github.com/nasa/spaceapps/discussions/2025) — supports clearly labeled synthetic telemetry when public real-time individual astronaut records are unavailable

Do not say that synthetic crew observations come from NASA, that public solar-event reports measure a specific astronaut's dose, or that the prototype predicts medical events.

## Collaboration

Recommended workflow: each teammate branches from `main`, opens small pull requests, keeps secrets out of the repository, and checks the API contract before merging. See [`docs/TEAM.md`](docs/TEAM.md). If putting the project on GitHub, choose your team's preferred license before granting reuse rights.

## AI use acknowledgement

The starter architecture, frontend, simulator, explanations, tests, and documentation were initially generated with assistance from **ChatGPT (OpenAI)** on 2026-11-14. All code, scientific statements, and visual assets must be reviewed by InfinityDz before submission. Declare AI assistance in the NASA Space Apps project submission as required by its current guidelines. Team contributions and validation should be recorded in the final submission.
