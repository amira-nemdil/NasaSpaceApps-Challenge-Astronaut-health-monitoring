"""Deterministic synthetic astronaut data and explainable *prototype* anomaly checks.

All astronauts and readings are fictitious. Baselines are simulated, thresholds
are illustrative and NOT validated for flight medicine or human diagnosis.
"""

from __future__ import annotations

from math import sin
from statistics import mean, pstdev
from typing import Literal

Scenario = Literal["nominal", "sleep_debt", "cardio_stress"]

CREW = [
    {"id": "crew-01", "name": "Dr. Maya Reyes", "role": "Mission commander", "initials": "MR", "base_hr": 63, "base_sleep": 7.6, "base_fatigue": 2, "base_mood": 4.4},
    {"id": "crew-02", "name": "Alex Morgan", "role": "Flight engineer", "initials": "AM", "base_hr": 68, "base_sleep": 7.1, "base_fatigue": 2.5, "base_mood": 4.2},
    {"id": "crew-03", "name": "Samira Chen", "role": "Mission specialist", "initials": "SC", "base_hr": 60, "base_sleep": 8.0, "base_fatigue": 2.1, "base_mood": 4.5},
]

# Floors prevent tiny demo-baseline variances from amplifying small changes.
# These values are design parameters, NOT astronaut clinical safety thresholds.
VARIABILITY_FLOORS = {"heart_rate": 3.0, "sleep_hours": 0.40, "fatigue": 0.7, "mood": 0.6}
FIELDS = ("heart_rate", "sleep_hours", "fatigue", "mood")
LABELS = {"heart_rate": "Resting heart rate", "sleep_hours": "Sleep duration", "fatigue": "Self-reported fatigue", "mood": "Self-reported mood"}
UNITS = {"heart_rate": "bpm", "sleep_hours": "h", "fatigue": "/10", "mood": "/5"}


def _round(x: float, places: int = 1) -> float:
    return round(float(x), places)


def make_readings(member: dict, scenario: Scenario) -> list[dict]:
    """Create fourteen fixed days; day 1–7 are each crew member's reference period."""
    offset = int(member["id"].split("-")[-1]) - 1
    rows = []
    for day in range(1, 15):
        phase = day + offset * 0.63
        hr = member["base_hr"] + 1.5 * sin(phase * 1.29) + 0.7 * sin(phase * 0.41)
        sleep = member["base_sleep"] + 0.28 * sin(phase * 1.72)
        fatigue = member["base_fatigue"] + 0.28 * sin(phase * 0.99)
        mood = member["base_mood"] + 0.19 * sin(phase * 1.07)

        # Scenarios affect the later timeline only, leaving a clean baseline.
        progression = max(0, day - 9) / 5
        if scenario == "sleep_debt":
            sleep -= 2.4 * progression
            hr += 5.0 * progression
            fatigue += 2.7 * progression
            mood -= 0.55 * progression
        elif scenario == "cardio_stress":
            hr += 14.0 * progression
            fatigue += 1.35 * progression
            sleep -= 0.55 * progression

        rows.append({
            "day": day,
            "heart_rate": _round(hr),
            "sleep_hours": _round(max(0, sleep), 2),
            "fatigue": _round(min(10, max(0, fatigue)), 1),
            "mood": _round(min(5, max(1, mood)), 1),
        })
    return rows


def _baselines(readings: list[dict]) -> dict:
    baseline_days = readings[:7]
    return {field: {
        "mean": _round(mean(day[field] for day in baseline_days), 2),
        "std": _round(max(pstdev(day[field] for day in baseline_days), VARIABILITY_FLOORS[field]), 2),
    } for field in FIELDS}


def _assess(reading: dict, baselines: dict) -> dict:
    deviation = {
        "heart_rate": (reading["heart_rate"] - baselines["heart_rate"]["mean"]) / baselines["heart_rate"]["std"],
        "sleep_hours": (baselines["sleep_hours"]["mean"] - reading["sleep_hours"]) / baselines["sleep_hours"]["std"],
        "fatigue": (reading["fatigue"] - baselines["fatigue"]["mean"]) / baselines["fatigue"]["std"],
        "mood": (baselines["mood"]["mean"] - reading["mood"]) / baselines["mood"]["std"],
    }
    drivers = []
    for field, z in sorted(deviation.items(), key=lambda e: e[1], reverse=True):
        if z >= 1.8:
            change = _round(reading[field] - baselines[field]["mean"], 1)
            drivers.append({
                "field": field,
                "label": LABELS[field],
                "baseline": baselines[field]["mean"],
                "current": reading[field],
                "unit": UNITS[field],
                "change": change,
                "score": _round(z, 2),
                "message": f"{LABELS[field]} differs from this crewmember's simulated baseline by {abs(change):g} {UNITS[field]}.",
            })
    elevated = [score for score in deviation.values() if score >= 1.8]
    if any(score >= 2.8 for score in elevated) or len(elevated) >= 2:
        status = "review"
        advice = "Recheck readings, log recent sleep and workload, and seek flight-medical review under mission protocol."
    elif elevated:
        status = "watch"
        advice = "Repeat the measurement and monitor the trend; escalate persistent changes under mission protocol."
    else:
        status = "normal"
        advice = "No significant deviation in this illustrative model; continue regular monitoring."

    return {
        "status": status,
        "drivers": drivers,
        "advice": advice,
        "score": _round(max(0.0, max(deviation.values())), 2),
        "is_clinically_validated": False,
    }


def mission(member: dict, scenario: Scenario) -> dict:
    readings = make_readings(member, scenario)
    baselines = _baselines(readings)
    timeline = [{**r, **_assess(r, baselines)} for r in readings]
    return {
        "crew": {k: v for k, v in member.items() if not k.startswith("base_")},
        "scenario": scenario,
        "data_source": "Synthetic telemetry generated locally (not NASA astronaut measurements)",
        "baseline_days": [1, 7],
        "baselines": baselines,
        "timeline": timeline,
        "last_day": timeline[-1],
        "disclaimer": "Educational decision-support prototype only. Not a medical device or flight-safety tool.",
    }
