"""AstroPulse: synthetic mission monitoring with a trusted MMASH model."""
import hashlib
import os
from typing import Literal

from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from .demo import DemoTimelineResponse, demo_model_timeline, make_demo_sensor_window
from .ml import InsufficientDataError, ModelRuntimeError, ModelScoreRequest, ModelScoreResponse, score_sensor_window, resolve_model_path
from .simulator import CREW, mission
from .weather import space_weather

load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)
VERSION = '0.2.0'
REVISION = os.getenv('VERCEL_GIT_COMMIT_SHA', os.getenv('APP_REVISION', 'local'))
DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://astronaut-health-monitoring-nasa-app-infinitydz.vercel.app']
origins = [value.strip().rstrip('/') for value in os.getenv('ASTROPULSE_CORS_ORIGINS', ','.join(DEFAULT_ORIGINS)).split(',') if value.strip()]
app = FastAPI(title='AstroPulse — InfinityDz', version=VERSION, description='Synthetic educational prototype; not for clinical use.')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])
Scenario = Literal['nominal', 'sleep_debt', 'cardio_stress']

@app.middleware('http')
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    if response.headers.get('content-type', '').startswith('text/html') and request.url.path not in ['/docs', '/redoc']:
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/health')
def health():
    return {'status': 'ok', 'service': 'AstroPulse', 'version': VERSION, 'revision': REVISION, 'synthetic': True}

@app.get('/api/ready')
def ready(response: Response):
    try:
        output = score_sensor_window(make_demo_sensor_window(CREW[0], 'nominal', 1))
        return {**health(), 'status': 'ready', 'model_version': output.model_version, 'model_sha256': hashlib.sha256(resolve_model_path().read_bytes()).hexdigest(), 'inference_checked': True}
    except (ModelRuntimeError, OSError):
        response.status_code = 503
        return {**health(), 'status': 'unavailable', 'model_available': False, 'detail': 'The trained model is unavailable or incompatible.'}

def member_by_id(crew_id):
    member = next((person for person in CREW if person['id'] == crew_id), None)
    if member is None:
        raise HTTPException(status_code=404, detail='Crew member not found')
    return member

@app.get('/api/crew')
def crew(scenario: Scenario = 'nominal'):
    missions = [mission(member, scenario) for member in CREW]
    return {'crew': [{**item['crew'], 'status': item['last_day']['status']} for item in missions], 'scenario': scenario, 'synthetic': True}

@app.get('/api/crew/{crew_id}')
def get_mission(crew_id: str, scenario: Scenario = 'nominal'):
    return mission(member_by_id(crew_id), scenario)

@app.post('/api/ml/score', response_model=ModelScoreResponse)
def score_ml_window(payload: ModelScoreRequest):
    try:
        return score_sensor_window(payload)
    except InsufficientDataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ModelRuntimeError as exc:
        raise HTTPException(status_code=503, detail='The trained MMASH model is unavailable or incompatible.') from exc

@app.get('/api/ml/demo/{crew_id}', response_model=DemoTimelineResponse)
def get_ml_demo(crew_id: str, scenario: Scenario = 'nominal'):
    member = member_by_id(crew_id)
    try:
        return demo_model_timeline(member, scenario)
    except ModelRuntimeError as exc:
        raise HTTPException(status_code=503, detail='The trained MMASH model is unavailable or incompatible.') from exc

app.get('/api/space-weather')(space_weather)
