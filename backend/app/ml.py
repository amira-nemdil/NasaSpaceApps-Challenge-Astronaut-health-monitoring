"""Runtime scoring contract for the MMASH Isolation Forest prototype.

The model reports statistical rarity relative to healthy terrestrial MMASH
recordings. It does not estimate disease probability, diagnose a condition,
or establish flight-medical risk.
"""

from __future__ import annotations

import math
import os
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field


MODEL_FEATURES = (
    "hr_mean_bpm",
    "hr_std_bpm",
    "activity_mean_log",
    "steps_sum_log",
    "lying_fraction",
    "hour_sin",
    "hour_cos",
)
DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parents[1] / "models" / "mmash_iforest_v1.joblib"
)
MIN_VALID_HEART_RATE_FRACTION = 0.60


class ModelRuntimeError(RuntimeError):
    """Base error for a model that cannot safely produce a score."""


class ModelArtifactNotFoundError(ModelRuntimeError):
    """Raised when the trained artifact has not been created or installed."""


class InvalidModelArtifactError(ModelRuntimeError):
    """Raised when an artifact does not match the documented runtime contract."""


class InsufficientDataError(ModelRuntimeError):
    """Raised when a sensor window does not meet the data-quality requirement."""


class ModelScoreRequest(BaseModel):
    """One aggregate five-minute wearable-sensor window."""

    crew_id: str = Field(min_length=1, max_length=80)
    timestamp: datetime
    window_minutes: Literal[5] = 5
    heart_rate_mean_bpm: float = Field(ge=20, le=260)
    heart_rate_std_bpm: float = Field(ge=0, le=100)
    activity_vector_magnitude_mean: float = Field(ge=0)
    steps: int = Field(ge=0)
    lying_fraction: float = Field(ge=0, le=1)
    valid_heart_rate_fraction: float = Field(ge=0, le=1)


class ModelDriver(BaseModel):
    feature: str
    direction: Literal["high", "low"]
    current: float
    reference_median: float
    robust_deviation: float
    message: str


class ModelDataQuality(BaseModel):
    valid_heart_rate_fraction: float
    accepted: bool
    minimum_required: float = MIN_VALID_HEART_RATE_FRACTION


class ModelScoreResponse(BaseModel):
    model_version: str
    window_minutes: int
    anomaly_score: float
    threshold: float
    is_anomaly: bool
    status: Literal["normal", "watch"]
    feature_values: dict[str, float]
    drivers: list[ModelDriver]
    data_quality: ModelDataQuality
    explanation_method: str
    is_clinically_validated: bool = False


def resolve_model_path(path: str | Path | None = None) -> Path:
    """Resolve an explicit path, environment override, or repository default."""

    if path is not None:
        return Path(path).expanduser().resolve()
    configured = os.getenv("ASTROPULSE_MODEL_PATH")
    if configured:
        return Path(configured).expanduser().resolve()
    return DEFAULT_MODEL_PATH


@lru_cache(maxsize=4)
def _load_artifact_cached(path_string: str) -> dict[str, Any]:
    path = Path(path_string)
    if not path.is_file():
        raise ModelArtifactNotFoundError(
            f"Trained MMASH model not found at {path}. "
            "Run backend/scripts/train_mmash.py first."
        )

    # joblib/pickle artifacts must only be loaded from this trusted project.
    try:
        artifact = joblib.load(path)
    except Exception as exc:  # pragma: no cover - the exact joblib error varies
        raise InvalidModelArtifactError(
            f"Unable to load the MMASH model artifact at {path}."
        ) from exc

    if not isinstance(artifact, dict):
        raise InvalidModelArtifactError("The MMASH artifact must be a dictionary.")

    required = {
        "pipeline",
        "feature_names",
        "calibration_scores",
        "reference_stats",
    }
    missing = sorted(required.difference(artifact))
    if missing:
        raise InvalidModelArtifactError(
            f"The MMASH artifact is missing required keys: {', '.join(missing)}."
        )

    pipeline = artifact["pipeline"]
    if not hasattr(pipeline, "score_samples"):
        raise InvalidModelArtifactError(
            "The artifact pipeline does not provide score_samples()."
        )

    if tuple(artifact["feature_names"]) != MODEL_FEATURES:
        raise InvalidModelArtifactError(
            "The artifact feature order does not match the runtime contract."
        )

    calibration = np.asarray(artifact["calibration_scores"], dtype=float).reshape(-1)
    calibration = calibration[np.isfinite(calibration)]
    if calibration.size == 0:
        raise InvalidModelArtifactError(
            "The artifact contains no finite calibration scores."
        )

    artifact["calibration_scores"] = np.sort(calibration)
    return artifact


def load_model_artifact(path: str | Path | None = None) -> dict[str, Any]:
    """Load and validate the trusted local model artifact."""

    return _load_artifact_cached(str(resolve_model_path(path)))


def clear_model_cache() -> None:
    """Clear the artifact cache, mainly for retraining and tests."""

    _load_artifact_cached.cache_clear()


def build_model_features(request: ModelScoreRequest) -> dict[str, float]:
    """Convert a public sensor-window request into the trained feature order."""

    if request.valid_heart_rate_fraction < MIN_VALID_HEART_RATE_FRACTION:
        raise InsufficientDataError(
            "At least 60% of heart-rate epochs must be valid before scoring."
        )

    # Preserve the submitted mission/local clock. MMASH time-of-day features
    # describe each participant's local daily schedule, not absolute UTC.
    timestamp = request.timestamp
    hour = timestamp.hour + timestamp.minute / 60 + timestamp.second / 3600
    angle = 2 * math.pi * hour / 24

    features = {
        "hr_mean_bpm": float(request.heart_rate_mean_bpm),
        "hr_std_bpm": float(request.heart_rate_std_bpm),
        "activity_mean_log": math.log1p(
            float(request.activity_vector_magnitude_mean)
        ),
        "steps_sum_log": math.log1p(float(request.steps)),
        "lying_fraction": float(request.lying_fraction),
        "hour_sin": math.sin(angle),
        "hour_cos": math.cos(angle),
    }
    if not all(math.isfinite(value) for value in features.values()):
        raise InsufficientDataError("All model inputs must be finite numbers.")
    return features


def _raw_feature_values(request: ModelScoreRequest) -> dict[str, float]:
    return {
        "heart_rate_mean_bpm": float(request.heart_rate_mean_bpm),
        "heart_rate_std_bpm": float(request.heart_rate_std_bpm),
        "activity_vector_magnitude_mean": float(
            request.activity_vector_magnitude_mean
        ),
        "steps": float(request.steps),
        "lying_fraction": float(request.lying_fraction),
    }


_DRIVER_DETAILS = {
    "hr_mean_bpm": ("heart_rate_mean_bpm", "Mean heart rate"),
    "hr_std_bpm": ("heart_rate_std_bpm", "Heart-rate variation"),
    "activity_mean_log": (
        "activity_vector_magnitude_mean",
        "Movement intensity",
    ),
    "steps_sum_log": ("steps", "Step count"),
    "lying_fraction": ("lying_fraction", "Time spent lying"),
}


def _display_value(feature: str, value: float) -> float:
    if feature in {"activity_mean_log", "steps_sum_log"}:
        return float(max(0.0, math.expm1(value)))
    return float(value)


def _reference_drivers(
    features: dict[str, float],
    reference_stats: Any,
    *,
    force_one: bool,
) -> list[ModelDriver]:
    if not isinstance(reference_stats, dict):
        return []

    candidates: list[tuple[float, ModelDriver]] = []
    for model_feature, (public_feature, label) in _DRIVER_DETAILS.items():
        stats = reference_stats.get(model_feature)
        if not isinstance(stats, dict):
            continue
        try:
            median = float(stats["median"])
            iqr = float(stats["iqr"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (math.isfinite(median) and math.isfinite(iqr)):
            continue

        # IQR / 1.349 approximates a standard deviation for a normal reference.
        robust_scale = max(abs(iqr) / 1.349, 1e-6)
        deviation = (features[model_feature] - median) / robust_scale
        direction: Literal["high", "low"] = "high" if deviation >= 0 else "low"
        current = _display_value(model_feature, features[model_feature])
        reference = _display_value(model_feature, median)
        driver = ModelDriver(
            feature=public_feature,
            direction=direction,
            current=round(current, 3),
            reference_median=round(reference, 3),
            robust_deviation=round(abs(deviation), 3),
            message=(
                f"{label} is {direction} relative to the MMASH reference "
                "windows; this describes statistical difference, not a diagnosis."
            ),
        )
        candidates.append((abs(deviation), driver))

    candidates.sort(key=lambda item: item[0], reverse=True)
    selected = [driver for deviation, driver in candidates if deviation >= 1.5]
    if force_one and not selected and candidates:
        selected = [candidates[0][1]]
    return selected[:3]


def score_sensor_window(
    request: ModelScoreRequest,
    *,
    artifact_path: str | Path | None = None,
) -> ModelScoreResponse:
    """Score one sensor window and return a calibrated, non-clinical result."""

    artifact = load_model_artifact(artifact_path)
    features = build_model_features(request)
    frame = pd.DataFrame([[features[name] for name in MODEL_FEATURES]], columns=MODEL_FEATURES)

    try:
        raw_anomaly = -float(artifact["pipeline"].score_samples(frame)[0])
    except Exception as exc:
        raise InvalidModelArtifactError(
            "The trained pipeline could not score the documented feature schema."
        ) from exc
    if not math.isfinite(raw_anomaly):
        raise InvalidModelArtifactError("The trained pipeline returned a non-finite score.")

    calibration = artifact["calibration_scores"]
    anomaly_score = float(
        np.searchsorted(calibration, raw_anomaly, side="right") / calibration.size
    )
    threshold = float(
        artifact.get("threshold_percentile", artifact.get("threshold", 0.99))
    )
    if not 0 < threshold <= 1:
        raise InvalidModelArtifactError("The artifact threshold must be in (0, 1].")
    is_anomaly = anomaly_score >= threshold

    return ModelScoreResponse(
        model_version=str(artifact.get("model_version", "mmash-iforest-v1")),
        window_minutes=request.window_minutes,
        anomaly_score=round(anomaly_score, 4),
        threshold=threshold,
        is_anomaly=is_anomaly,
        status="watch" if is_anomaly else "normal",
        feature_values=_raw_feature_values(request),
        drivers=_reference_drivers(
            features,
            artifact["reference_stats"],
            force_one=is_anomaly,
        ),
        data_quality=ModelDataQuality(
            valid_heart_rate_fraction=request.valid_heart_rate_fraction,
            accepted=True,
        ),
        explanation_method=(
            "Held-out reference percentile plus robust feature deviations; "
            "not Isolation Forest feature attribution"
        ),
        is_clinically_validated=False,
    )
