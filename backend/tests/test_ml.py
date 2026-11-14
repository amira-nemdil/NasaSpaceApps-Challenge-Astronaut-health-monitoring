from math import isclose, log1p

from fastapi.testclient import TestClient

from app.main import app
from app.ml import MODEL_FEATURES, ModelScoreRequest, build_model_features


client = TestClient(app)


def _payload(**overrides):
    payload = {
        "crew_id": "crew-01",
        "timestamp": "2026-11-15T10:35:00Z",
        "window_minutes": 5,
        "heart_rate_mean_bpm": 84.1,
        "heart_rate_std_bpm": 6.3,
        "activity_vector_magnitude_mean": 18.6,
        "steps": 12,
        "lying_fraction": 0.0,
        "valid_heart_rate_fraction": 0.96,
    }
    payload.update(overrides)
    return payload


def test_runtime_feature_contract_has_fixed_order_and_transforms():
    features = build_model_features(ModelScoreRequest(**_payload()))

    assert tuple(features) == MODEL_FEATURES
    assert isclose(features["activity_mean_log"], log1p(18.6))
    assert isclose(features["steps_sum_log"], log1p(12))
    assert -1 <= features["hour_sin"] <= 1
    assert -1 <= features["hour_cos"] <= 1


def test_ml_score_endpoint_returns_calibrated_non_clinical_result():
    response = client.post("/api/ml/score", json=_payload())

    assert response.status_code == 200
    result = response.json()
    assert result["model_version"] == "mmash-iforest-v1"
    assert 0 <= result["anomaly_score"] <= 1
    assert result["threshold"] == 0.99
    assert result["status"] in {"normal", "watch"}
    assert result["is_clinically_validated"] is False
    assert result["data_quality"] == {
        "valid_heart_rate_fraction": 0.96,
        "accepted": True,
        "minimum_required": 0.6,
    }


def test_ml_score_endpoint_flags_an_extreme_window_without_diagnosing():
    response = client.post(
        "/api/ml/score",
        json=_payload(
            timestamp="2026-11-15T03:35:00Z",
            heart_rate_mean_bpm=180,
            heart_rate_std_bpm=40,
            activity_vector_magnitude_mean=0,
            steps=0,
            lying_fraction=1,
        ),
    )

    assert response.status_code == 200
    result = response.json()
    assert result["is_anomaly"] is True
    assert result["status"] == "watch"
    assert result["drivers"]
    assert all("diagnosis" in driver["message"] for driver in result["drivers"])


def test_ml_score_endpoint_rejects_insufficient_heart_rate_coverage():
    response = client.post(
        "/api/ml/score",
        json=_payload(valid_heart_rate_fraction=0.59),
    )

    assert response.status_code == 422
    assert "60%" in response.json()["detail"]
