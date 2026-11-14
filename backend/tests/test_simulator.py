from fastapi.testclient import TestClient

from app.main import app
from app.simulator import CREW, make_readings, mission

client = TestClient(app)


def test_nominal_timeline_is_stable():
    item = mission(CREW[0], "nominal")
    assert len(item["timeline"]) == 14
    assert item["timeline"][0]["status"] == "normal"
    assert item["last_day"]["status"] == "normal"


def test_scenarios_change_readings_not_baseline():
    normal = mission(CREW[0], "nominal")
    sleep = mission(CREW[0], "sleep_debt")
    stress = mission(CREW[0], "cardio_stress")
    assert normal["baselines"] == sleep["baselines"] == stress["baselines"]
    assert sleep["last_day"]["sleep_hours"] < normal["last_day"]["sleep_hours"]
    assert stress["last_day"]["heart_rate"] > normal["last_day"]["heart_rate"]
    assert sleep["last_day"]["status"] in ("watch", "review")
    assert stress["last_day"]["status"] in ("watch", "review")
    assert make_readings(CREW[0], "sleep_debt") == make_readings(CREW[0], "sleep_debt")


def test_api_contract_and_invalid_inputs():
    assert client.get("/api/health").json()["synthetic"] is True
    response = client.get("/api/crew/crew-01?scenario=sleep_debt")
    assert response.status_code == 200
    assert response.json()["data_source"].startswith("Synthetic")
    assert response.json()["timeline"][-1]["drivers"]
    assert client.get("/api/crew/missing").status_code == 404
    assert client.get("/api/crew/crew-01?scenario=alien").status_code == 422


def test_crew_api_returns_three_profiles():
    response = client.get("/api/crew?scenario=cardio_stress")
    assert response.status_code == 200
    data = response.json()
    assert data["synthetic"] is True
    assert len(data["crew"]) == 3
    assert {person["id"] for person in data["crew"]} == {person["id"] for person in CREW}


def test_space_weather_does_not_fabricate_events_when_offline(monkeypatch):
    from app import main
    from urllib.error import URLError

    def offline(*args, **kwargs):
        raise URLError("offline")

    monkeypatch.setattr(main, "urlopen", offline)
    response = client.get("/api/space-weather")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert data["events"] == []
    assert "unavailable" in data["error"]
