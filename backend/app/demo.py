"""Deterministic five-minute sensor windows for demos without hardware.

The generated values are synthetic and exist only to exercise the same runtime
contract that a calibrated wearable integration would use later.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import sin
from typing import Literal

from pydantic import BaseModel

from .ml import ModelScoreRequest, ModelScoreResponse, score_sensor_window
from .simulator import Scenario, mission


DEMO_START = datetime(2026, 11, 1, 10, 35, tzinfo=timezone.utc)


class DemoTimelineItem(BaseModel):
    mission_day: int
    model_input: ModelScoreRequest
    model_output: ModelScoreResponse
    baseline_assessment: dict
    overall_status: Literal["normal", "watch", "review"]


class DemoTimelineResponse(BaseModel):
    crew: dict[str, str]
    scenario: Scenario
    synthetic: Literal[True] = True
    window_minutes: Literal[5] = 5
    data_source: str
    timeline: list[DemoTimelineItem]
    last_day: DemoTimelineItem
    disclaimer: str


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def make_demo_sensor_window(
    member: dict,
    scenario: Scenario,
    mission_day: int,
) -> ModelScoreRequest:
    """Create a reproducible five-minute model input for one mission day."""

    if not 1 <= mission_day <= 14:
        raise ValueError("mission_day must be between 1 and 14")

    crew_offset = int(member["id"].split("-")[-1]) - 1
    phase = mission_day * 0.83 + crew_offset * 0.57
    progression = max(0.0, mission_day - 9) / 5.0

    # A daytime five-minute window, distinct from the daily resting-HR value in
    # simulator.py. These are engineering demo values, not clinical thresholds.
    heart_rate_mean = member["base_hr"] + 8.0 + 1.4 * sin(phase)
    heart_rate_std = 4.3 + 0.5 * sin(phase * 1.31)
    activity_mean = 23.0 + 3.2 * sin(phase * 0.71)
    steps = 26.0 + 5.0 * sin(phase * 0.92)
    lying_fraction = 0.05 + 0.015 * sin(phase * 1.17)

    if scenario == "sleep_debt":
        heart_rate_mean += 24.0 * progression
        heart_rate_std += 8.0 * progression
        activity_mean *= 1.0 - 0.90 * progression
        steps *= 1.0 - 0.90 * progression
        lying_fraction += 0.90 * progression
    elif scenario == "cardio_stress":
        # High cardiovascular readings with little concurrent movement model a
        # synthetic at-rest mismatch that the anomaly detector can demonstrate.
        heart_rate_mean += 44.0 * progression
        heart_rate_std += 16.0 * progression
        activity_mean *= 1.0 - 0.90 * progression
        steps *= 1.0 - 0.95 * progression
        lying_fraction += 0.15 * progression

    timestamp = DEMO_START + timedelta(days=mission_day - 1)
    return ModelScoreRequest(
        crew_id=member["id"],
        timestamp=timestamp,
        window_minutes=5,
        heart_rate_mean_bpm=round(_clamp(heart_rate_mean, 20, 260), 2),
        heart_rate_std_bpm=round(_clamp(heart_rate_std, 0, 100), 2),
        activity_vector_magnitude_mean=round(max(0.0, activity_mean), 2),
        steps=max(0, round(steps)),
        lying_fraction=round(_clamp(lying_fraction, 0, 1), 3),
        valid_heart_rate_fraction=0.98,
    )


def demo_model_timeline(member: dict, scenario: Scenario) -> DemoTimelineResponse:
    """Generate and score the 14 deterministic demo windows for one crewmember."""

    baseline_timeline = mission(member, scenario)["timeline"]
    timeline = []
    for mission_day in range(1, 15):
        model_input = make_demo_sensor_window(member, scenario, mission_day)
        model_output = score_sensor_window(model_input)
        daily = baseline_timeline[mission_day - 1]
        baseline_assessment = {
            "status": daily["status"],
            "score": daily["score"],
            "drivers": daily["drivers"],
            "advice": daily["advice"],
            "is_clinically_validated": daily["is_clinically_validated"],
        }
        if daily["status"] == "review":
            overall_status = "review"
        elif daily["status"] == "watch" or model_output.status == "watch":
            overall_status = "watch"
        else:
            overall_status = "normal"
        timeline.append(
            DemoTimelineItem(
                mission_day=mission_day,
                model_input=model_input,
                model_output=model_output,
                baseline_assessment=baseline_assessment,
                overall_status=overall_status,
            )
        )

    return DemoTimelineResponse(
        crew={
            "id": member["id"],
            "name": member["name"],
            "role": member["role"],
        },
        scenario=scenario,
        data_source=(
            "Deterministic synthetic five-minute wearable windows generated "
            "locally; not physical-sensor or NASA astronaut measurements"
        ),
        timeline=timeline,
        last_day=timeline[-1],
        disclaimer=(
            "Hardware-free educational demo only. Model scores describe rarity "
            "relative to MMASH and are not diagnoses or flight-safety decisions."
        ),
    )
