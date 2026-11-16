"""Process-local DONKI cache: bounded upstream requests and honest stale data."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import os
import threading
import time
from urllib.parse import urlencode
from urllib.request import urlopen

_lock = threading.Lock()
_cached = None
_next_attempt = 0.0

def clear_weather_cache():
    global _cached, _next_attempt
    with _lock:
        _cached, _next_attempt = None, 0.0

def space_weather():
    global _cached, _next_attempt
    with _lock:
        if _cached is not None and time.monotonic() < _next_attempt:
            return {**deepcopy(_cached), "cached": True}
        end = datetime.now(timezone.utc).date()
        window = {"start": (end-timedelta(days=30)).isoformat(), "end": end.isoformat()}
        params = urlencode({"startDate": window["start"], "endDate": window["end"], "api_key": os.getenv("NASA_API_KEY", "DEMO_KEY")})
        try:
            with urlopen(f"https://api.nasa.gov/DONKI/SEP?{params}", timeout=6) as response:
                events = json.load(response)
            if not isinstance(events, list) or any(not isinstance(event, dict) or not isinstance(event.get("sepID"), str) or not isinstance(event.get("eventTime"), str) for event in events):
                raise ValueError("Unexpected NASA event schema")
            result = {"available": True, "events": [{"event_id": event["sepID"], "event_time": event["eventTime"], "source": "NASA DONKI SEP event report"} for event in events[-8:]], "window": window, "fetched_at": datetime.now(timezone.utc).isoformat(), "stale": False, "cached": False}
            _next_attempt = time.monotonic() + 300
        except (OSError, ValueError, TimeoutError):
            _next_attempt = time.monotonic() + 60
            if _cached and _cached["available"]:
                result = {**deepcopy(_cached), "stale": True, "cached": True, "error": "NASA feed unavailable; showing saved event reports."}
            else:
                result = {"available": False, "events": [], "window": window, "fetched_at": None, "stale": False, "cached": False, "error": "NASA DONKI currently unavailable; no events were invented."}
        result["data_source"] = "NASA DONKI (real event metadata)" if result["available"] else "NASA DONKI (unavailable)"
        result["important"] = "Space-weather event reports are not crew radiation-dose measurements or health-risk estimates."
        _cached = result
        return deepcopy(result)
