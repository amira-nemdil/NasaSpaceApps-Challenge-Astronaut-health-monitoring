FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/app backend/app
COPY backend/models backend/models
COPY app.py app.py
COPY --from=frontend /build/frontend/dist frontend/dist
RUN useradd --create-home astropulse
USER astropulse
EXPOSE 8000
HEALTHCHECK --interval=30s --start-period=30s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/ready', timeout=5)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
