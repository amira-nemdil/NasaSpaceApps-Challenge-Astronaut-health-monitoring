"""AstroPulse API: deterministic simulation + optional real NASA event reports."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .simulator import CREW, mission

app = FastAPI(title="AstroPulse — InfinityDz", version="0.1.0", description="Synthetic astronaut health monitoring; not for clinical use.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=False, allow_methods=["GET"], allow_headers=["*"])

Scenario = Literal["nominal", "sleep_debt", "cardio_stress"]


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "AstroPulse", "synthetic": True}


@app.get("/api/crew")
def crew(scenario: Scenario = "nominal"):
    return {"crew": [
        {**mission(member, scenario)["crew"], "status": mission(member, scenario)["last_day"]["status"]}
        for member in CREW
    ], "scenario": scenario, "synthetic": True}


@app.get("/api/crew/{crew_id}")
def get_mission(crew_id: str, scenario: Scenario = "nominal"):
    member = next((person for person in CREW if person["id"] == crew_id), None)
    if not member:
        raise HTTPException(status_code=404, detail="Crew member not found")
    return mission(member, scenario)


@app.get("/api/space-weather")
def space_weather():
    """Return *reported SEP events*, NOT predicted crew exposure or medical impact.

    NASA's publicly documented DONKI service can be rate-limited/unavailable. The
    UI degrades gracefully; we never replace failed NASA requests with fake events.
    """
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=30)
    params = urlencode({
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "api_key": os.getenv("NASA_API_KEY", "DEMO_KEY"),
    })
    url = f"https://api.nasa.gov/DONKI/SEP?{params}"
    try:
        with urlopen(url, timeout=6) as response:
            events = json.load(response)
        if not isinstance(events, list):
            raise ValueError("Unexpected event format")
        simplified = [{
            "event_id": e.get("sepID", "unidentified event"),
            "event_time": e.get("eventTime"),
            "source": "NASA DONKI — solar energetic particle event report",
        } for e in events]
        return {
            "available": True,
            "events": simplified[-8:],
            "window": {"start": start.isoformat(), "end": end.isoformat()},
            "data_source": "NASA DONKI (real event metadata)",
            "important": "These are event reports, not a specific astronaut's radiation dose, risk, or location-dependent exposure.",
        }
    except (URLError, HTTPError, TimeoutError, ValueError, json.JSONDecodeError, OSError) as exc:
        return {
            "available": False, "events": [], "error": "NASA DONKI currently unavailable; no events were invented.",
            "window": {"start": start.isoformat(), "end": end.isoformat()},
            "data_source": "NASA DONKI (unavailable)",
            "important": "Space-weather event reports are not crew radiation-dose measurements.",
        }
