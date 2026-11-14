"""Train AstroPulse's MMASH Isolation Forest model.

The trainer converts each participant's one-second ``Actigraph.csv`` data into
non-overlapping five-minute windows. Participant-level splits keep adjacent
windows from the same person out of different train/evaluation partitions.

Run from the repository root::

    python backend/scripts/train_mmash.py

The raw MMASH files are expected at ``data/raw/mmash/user_*/Actigraph.csv``.
"""

from __future__ import annotations

import argparse
import json
import math
import platform
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler


MODEL_VERSION = "mmash-iforest-v1"
WINDOW_MINUTES = 5
MIN_VALID_HEART_RATE_FRACTION = 0.60
THRESHOLD_PERCENTILE = 0.99
RANDOM_SEED = 42

FEATURE_NAMES = [
    "hr_mean_bpm",
    "hr_std_bpm",
    "activity_mean_log",
    "steps_sum_log",
    "lying_fraction",
    "hour_sin",
    "hour_cos",
]

MMASH_CITATION = (
    "Rossi, A. et al. (2020). Multilevel Monitoring of Activity and Sleep "
    "in Healthy People (version 1.0.0). PhysioNet. "
    "https://doi.org/10.13026/cerq-fc86"
)
MMASH_LICENSE = "Open Data Commons Open Database License v1.0"


def _participant_number(path: Path) -> int:
    match = re.search(r"(\d+)$", path.parent.name)
    if not match:
        raise ValueError(f"Cannot determine participant number from {path}")
    return int(match.group(1))


def discover_actigraph_files(data_dir: Path) -> list[Path]:
    """Return MMASH participant Actigraph files in numeric user order."""
    files = list(data_dir.glob("user_*/Actigraph.csv"))
    return sorted(files, key=_participant_number)


def build_participant_windows(
    actigraph_path: Path,
    *,
    window_minutes: int = WINDOW_MINUTES,
    min_valid_hr_fraction: float = MIN_VALID_HEART_RATE_FRACTION,
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Aggregate one participant's one-second ActiGraph rows into windows."""
    frame = pd.read_csv(actigraph_path, low_memory=False)
    required = {
        "HR",
        "Vector Magnitude",
        "Steps",
        "Inclinometer Lying",
        "day",
        "time",
    }
    missing = sorted(required.difference(frame.columns))
    if missing:
        raise ValueError(f"{actigraph_path} is missing columns: {', '.join(missing)}")

    day = pd.to_numeric(frame["day"], errors="coerce")
    clock = pd.to_timedelta(frame["time"].astype(str), errors="coerce")
    absolute_seconds = (day - 1.0) * 86_400.0 + clock.dt.total_seconds()
    usable_time = absolute_seconds.notna()
    frame = frame.loc[usable_time].copy()
    frame["_absolute_seconds"] = absolute_seconds.loc[usable_time]

    heart_rate = pd.to_numeric(frame["HR"], errors="coerce")
    # Values outside a broad physically possible sensor range are data errors,
    # not evidence of an anomaly for this research prototype.
    frame["_heart_rate"] = heart_rate.where(heart_rate.between(25, 240))
    frame["_activity"] = pd.to_numeric(
        frame["Vector Magnitude"], errors="coerce"
    ).clip(lower=0)
    frame["_steps"] = pd.to_numeric(frame["Steps"], errors="coerce").clip(lower=0)
    frame["_lying"] = pd.to_numeric(
        frame["Inclinometer Lying"], errors="coerce"
    ).clip(lower=0, upper=1)

    window_seconds = window_minutes * 60
    frame["_window_start_seconds"] = (
        np.floor(frame["_absolute_seconds"] / window_seconds) * window_seconds
    ).astype("int64")

    grouped = frame.groupby("_window_start_seconds", sort=True)
    windows = grouped.agg(
        observed_epochs=("_heart_rate", "size"),
        valid_hr_epochs=("_heart_rate", lambda series: int(series.notna().sum())),
        hr_mean_bpm=("_heart_rate", "mean"),
        hr_std_bpm=(
            "_heart_rate",
            lambda series: float(np.nanstd(series.to_numpy(dtype=float), ddof=0)),
        ),
        activity_mean=("_activity", "mean"),
        steps_sum=("_steps", lambda series: series.sum(min_count=1)),
        lying_fraction=("_lying", "mean"),
    ).reset_index()

    windows["valid_heart_rate_fraction"] = (
        windows["valid_hr_epochs"] / float(window_seconds)
    ).clip(upper=1.0)
    total_windows = int(len(windows))
    windows = windows.loc[
        windows["valid_heart_rate_fraction"] >= min_valid_hr_fraction
    ].copy()

    windows["activity_mean_log"] = np.log1p(windows["activity_mean"].clip(lower=0))
    windows["steps_sum_log"] = np.log1p(windows["steps_sum"].clip(lower=0))
    middle_seconds = windows["_window_start_seconds"] + window_seconds / 2.0
    hour_angle = 2.0 * math.pi * ((middle_seconds % 86_400.0) / 86_400.0)
    windows["hour_sin"] = np.sin(hour_angle)
    windows["hour_cos"] = np.cos(hour_angle)

    participant = actigraph_path.parent.name
    windows.insert(0, "participant", participant)
    windows.insert(1, "window_start_seconds", windows.pop("_window_start_seconds"))
    quality = {
        "raw_rows": int(len(frame)),
        "candidate_windows": total_windows,
        "accepted_windows": int(len(windows)),
    }
    return windows, quality


def build_dataset(
    actigraph_files: Iterable[Path],
    *,
    window_minutes: int = WINDOW_MINUTES,
    min_valid_hr_fraction: float = MIN_VALID_HEART_RATE_FRACTION,
) -> tuple[pd.DataFrame, dict[str, dict[str, int]]]:
    """Build the full window table and per-participant quality summary."""
    tables: list[pd.DataFrame] = []
    quality: dict[str, dict[str, int]] = {}
    for path in actigraph_files:
        windows, participant_quality = build_participant_windows(
            path,
            window_minutes=window_minutes,
            min_valid_hr_fraction=min_valid_hr_fraction,
        )
        if windows.empty:
            raise ValueError(f"No valid windows remained for {path.parent.name}")
        tables.append(windows)
        quality[path.parent.name] = participant_quality
    if not tables:
        raise ValueError("No participant files were provided")
    return pd.concat(tables, ignore_index=True), quality


def split_participants(
    participants: Iterable[str], *, seed: int = RANDOM_SEED
) -> dict[str, list[str]]:
    """Create deterministic 70/15/15 participant-level partitions."""
    names = sorted(set(participants), key=lambda name: int(name.rsplit("_", 1)[-1]))
    if len(names) < 3:
        raise ValueError("At least three participants are required for separate splits")
    shuffled = np.asarray(names, dtype=object)
    np.random.default_rng(seed).shuffle(shuffled)

    count = len(shuffled)
    test_count = max(1, int(round(count * 0.15)))
    calibration_count = max(1, int(round(count * 0.15)))
    if test_count + calibration_count >= count:
        calibration_count = 1
        test_count = 1

    test = shuffled[:test_count].tolist()
    calibration = shuffled[test_count : test_count + calibration_count].tolist()
    train = shuffled[test_count + calibration_count :].tolist()
    return {"train": train, "calibration": calibration, "test": test}


def _reference_stats(frame: pd.DataFrame) -> dict[str, dict[str, float]]:
    stats: dict[str, dict[str, float]] = {}
    for feature in FEATURE_NAMES:
        numeric = pd.to_numeric(frame[feature], errors="coerce").dropna()
        if numeric.empty:
            raise ValueError(f"Training feature {feature} has no numeric values")
        first_quartile = float(numeric.quantile(0.25))
        third_quartile = float(numeric.quantile(0.75))
        stats[feature] = {
            "median": float(numeric.median()),
            "iqr": max(third_quartile - first_quartile, 1e-9),
        }
    return stats


def _percentile_scores(
    raw_scores: np.ndarray, sorted_calibration_scores: np.ndarray
) -> np.ndarray:
    positions = np.searchsorted(sorted_calibration_scores, raw_scores, side="right")
    return positions.astype(float) / float(len(sorted_calibration_scores))


def train_model(
    windows: pd.DataFrame,
    *,
    seed: int = RANDOM_SEED,
    threshold_percentile: float = THRESHOLD_PERCENTILE,
) -> tuple[dict, dict]:
    """Fit the model and return the joblib artifact and JSON-safe metadata."""
    splits = split_participants(windows["participant"], seed=seed)
    split_frames = {
        name: windows.loc[windows["participant"].isin(participants)].copy()
        for name, participants in splits.items()
    }
    if any(frame.empty for frame in split_frames.values()):
        raise ValueError("Participant split produced an empty dataset partition")

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
            (
                "isolation_forest",
                IsolationForest(
                    n_estimators=300,
                    contamination="auto",
                    random_state=seed,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    train_values = split_frames["train"][FEATURE_NAMES]
    pipeline.fit(train_values)

    calibration_scores = -pipeline.score_samples(
        split_frames["calibration"][FEATURE_NAMES]
    )
    sorted_calibration_scores = np.sort(np.asarray(calibration_scores, dtype=float))
    if sorted_calibration_scores.size == 0:
        raise ValueError("No calibration scores were produced")
    raw_threshold = float(
        np.quantile(sorted_calibration_scores, threshold_percentile, method="linear")
    )

    test_raw_scores = -pipeline.score_samples(split_frames["test"][FEATURE_NAMES])
    test_percentiles = _percentile_scores(test_raw_scores, sorted_calibration_scores)
    created_at = datetime.now(timezone.utc).isoformat()

    metadata = {
        "model_version": MODEL_VERSION,
        "created_at": created_at,
        "feature_names": FEATURE_NAMES,
        "window_minutes": WINDOW_MINUTES,
        "minimum_valid_heart_rate_fraction": MIN_VALID_HEART_RATE_FRACTION,
        "threshold_percentile": threshold_percentile,
        "raw_score_threshold": raw_threshold,
        "random_seed": seed,
        "library_versions": {
            "python": platform.python_version(),
            "joblib": joblib.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
        },
        "participant_splits": splits,
        "window_counts": {
            name: int(len(frame)) for name, frame in split_frames.items()
        },
        "held_out_test": {
            "score_count": int(len(test_percentiles)),
            "mean_anomaly_percentile": float(np.mean(test_percentiles)),
            "median_anomaly_percentile": float(np.median(test_percentiles)),
            "flagged_fraction_at_threshold": float(
                np.mean(test_percentiles >= threshold_percentile)
            ),
        },
        "data_source": "MMASH v1.0.0 (healthy adult Earth-based recordings)",
        "citation": MMASH_CITATION,
        "license": MMASH_LICENSE,
        "clinical_claim": (
            "Research prototype only; anomaly percentiles are not disease "
            "probabilities and are not clinically validated for astronauts."
        ),
    }
    artifact = {
        "model_version": MODEL_VERSION,
        "pipeline": pipeline,
        "feature_names": FEATURE_NAMES,
        # Runtime uses -score_samples and ranks it against this distribution.
        "calibration_scores": sorted_calibration_scores,
        "threshold": threshold_percentile,
        "threshold_percentile": threshold_percentile,
        "reference_stats": _reference_stats(split_frames["train"]),
        "metadata": metadata,
    }
    return artifact, metadata


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(
        description="Train the AstroPulse MMASH Isolation Forest model."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=repo_root / "data" / "raw" / "mmash",
        help="Directory containing user_*/Actigraph.csv files.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=repo_root / "backend" / "models" / "mmash_iforest_v1.joblib",
        help="Output joblib artifact path.",
    )
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    parser.add_argument(
        "--threshold-percentile",
        type=float,
        default=THRESHOLD_PERCENTILE,
        help="Calibration percentile used to flag unusual windows (0-1).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0.5 < args.threshold_percentile < 1.0:
        raise SystemExit("--threshold-percentile must be between 0.5 and 1.0")

    files = discover_actigraph_files(args.data_dir)
    if not files:
        raise SystemExit(
            f"No Actigraph.csv files found under {args.data_dir}. "
            "Expected data/raw/mmash/user_*/Actigraph.csv."
        )
    windows, quality = build_dataset(files)
    artifact, metadata = train_model(
        windows,
        seed=args.seed,
        threshold_percentile=args.threshold_percentile,
    )
    metadata["source_quality"] = quality

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, args.output, compress=3)
    metadata_path = args.output.with_suffix(".metadata.json")
    metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    counts = metadata["window_counts"]
    held_out = metadata["held_out_test"]
    print(f"Loaded {len(files)} participants and {len(windows):,} valid windows.")
    print(
        "Split windows: "
        f"train={counts['train']:,}, calibration={counts['calibration']:,}, "
        f"test={counts['test']:,}."
    )
    print(
        "Held-out flagged fraction at "
        f"p={metadata['threshold_percentile']:.3f}: "
        f"{held_out['flagged_fraction_at_threshold']:.3f}."
    )
    print(f"Saved model: {args.output}")
    print(f"Saved metadata: {metadata_path}")


if __name__ == "__main__":
    main()
