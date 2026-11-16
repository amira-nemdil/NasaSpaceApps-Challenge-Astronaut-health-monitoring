"""Unified production entrypoint: API first, built frontend at the same origin."""
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from backend.app.main import app

dist = Path(__file__).resolve().parent / 'frontend' / 'dist'
if dist.is_dir():
    app.mount('/', StaticFiles(directory=dist, html=True), name='frontend')
