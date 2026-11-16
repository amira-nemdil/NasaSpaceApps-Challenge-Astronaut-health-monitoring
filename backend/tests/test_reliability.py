import io
import json
from urllib.error import URLError
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.ml import clear_model_cache
from app import weather
from scripts.train_mmash import build_participant_windows, split_participants

client = TestClient(app)

def test_readiness_checks_model_and_missing_model_does_not_pass(monkeypatch, tmp_path):
    assert client.get('/api/ready').json()['inference_checked'] is True
    monkeypatch.setenv('ASTROPULSE_MODEL_PATH', str(tmp_path/'missing.joblib'))
    clear_model_cache()
    assert client.get('/api/health').status_code == 200
    response = client.get('/api/ready')
    assert response.status_code == 503
    assert response.json()['status'] == 'unavailable'
    assert str(tmp_path) not in response.text
    clear_model_cache()

def test_release_checksum_is_enforced(monkeypatch):
    monkeypatch.setenv('ASTROPULSE_MODEL_SHA256', '0'*64)
    clear_model_cache()
    assert client.get('/api/ready').status_code == 503
    clear_model_cache()

def test_replaced_artifact_is_reloaded_without_a_process_restart(tmp_path):
    import joblib
    from app.ml import load_model_artifact
    original = load_model_artifact()
    path = tmp_path/'release.joblib'
    joblib.dump({**original, 'model_version': 'first-release'}, path)
    assert load_model_artifact(path)['model_version'] == 'first-release'
    joblib.dump({**original, 'model_version': 'replacement-release-longer'}, path)
    assert load_model_artifact(path)['model_version'] == 'replacement-release-longer'
    clear_model_cache()

def test_production_origin_is_allowed_and_unrelated_origin_is_rejected():
    headers = {'Origin': 'https://astronaut-health-monitoring-nasa-app-infinitydz.vercel.app', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'}
    assert client.options('/api/ml/score', headers=headers).status_code == 200
    headers['Origin'] = 'https://untrusted.example'
    assert client.options('/api/ml/score', headers=headers).status_code == 400

def test_duplicate_timestamps_cannot_fabricate_coverage(tmp_path):
    source = tmp_path/'user_99'/'Actigraph.csv'
    source.parent.mkdir()
    row = {'HR':70, 'Vector Magnitude':0, 'Steps':0, 'Inclinometer Lying':0, 'day':1, 'time':'12:00:00'}
    pd.DataFrame([row]*180).to_csv(source, index=False)
    windows, _ = build_participant_windows(source)
    assert windows.empty
    rows = [{**row, 'time': f'12:{second//60:02}:{second%60:02}'} for second in range(180)]
    pd.DataFrame(rows).to_csv(source, index=False)
    windows, _ = build_participant_windows(source)
    assert len(windows) == 1
    assert windows.iloc[0]['valid_heart_rate_fraction'] == .6

def test_participant_splits_remain_disjoint_across_seeds():
    for seed in range(5):
        parts = split_participants([f'user_{i}' for i in range(1,23)], seed=seed)
        sets = [set(parts[key]) for key in ['train','calibration','test']]
        assert not sets[0] & sets[1] and not sets[0] & sets[2] and not sets[1] & sets[2]
        assert len(set.union(*sets)) == 22

def test_donki_cache_bounds_requests_and_rejects_malformed_events(monkeypatch):
    weather.clear_weather_cache()
    calls = []
    def upstream(*args, **kwargs):
        calls.append(1)
        return io.BytesIO(json.dumps([{'sepID':'event-1','eventTime':'2026-11-01T00:00Z'}]).encode())
    monkeypatch.setattr(weather, 'urlopen', upstream)
    first = weather.space_weather()
    assert first['available'] and first['fetched_at']
    assert weather.space_weather()['cached'] is True
    assert len(calls) == 1
    weather.clear_weather_cache()
    monkeypatch.setattr(weather, 'urlopen', lambda *a,**k: io.BytesIO(b'[null]'))
    malformed = weather.space_weather()
    assert malformed['available'] is False and malformed['events'] == []
    weather.clear_weather_cache()

def test_donki_failure_returns_explicit_stale_reports(monkeypatch):
    weather.clear_weather_cache()
    monkeypatch.setattr(weather, 'urlopen', lambda *a,**k: io.BytesIO(b'[]'))
    assert weather.space_weather()['available']
    monkeypatch.setattr(weather, '_next_attempt', 0)
    def unavailable(*args, **kwargs): raise URLError('offline')
    monkeypatch.setattr(weather, 'urlopen', unavailable)
    result = weather.space_weather()
    assert result['stale'] is True and result['available'] is True
    assert result['events'] == [] and 'saved' in result['error']
    weather.clear_weather_cache()

def test_runtime_requires_explicit_timestamp_offset():
    from app.ml import ModelScoreRequest
    from pydantic import ValidationError
    import pytest
    with pytest.raises(ValidationError):
        ModelScoreRequest(crew_id='crew-01', timestamp='2026-11-15T12:00:00', heart_rate_mean_bpm=70, heart_rate_std_bpm=4, activity_vector_magnitude_mean=20, steps=12, lying_fraction=0, valid_heart_rate_fraction=.9)
