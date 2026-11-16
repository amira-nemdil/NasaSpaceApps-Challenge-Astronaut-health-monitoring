# Deploying AstroPulse

The repository now provides a unified production entrypoint, `app.py`: FastAPI handles `/api/*`, then serves `frontend/dist`. Both parts share one origin. Keep Python 3.13 and the pinned model libraries when serving the committed joblib artifact.

## Existing Vercel project

1. Publish these source changes to the repository branch used by Vercel. Do not assume a local build changes the public site.
2. In the existing project's settings, use the **repository root**, rather than `frontend`, as Root Directory. The root contains `vercel.json`, `.python-version`, `pyproject.toml`, and `requirements.txt`.
3. Use the FastAPI framework preset. The configured entrypoint is `app:app`; the build runs `npm --prefix frontend ci && npm --prefix frontend run build`. Remove old frontend-only build/output-directory overrides that conflict with this configuration. FastAPI's mounted static directory is promoted according to the Vercel Python/FastAPI configuration.
4. Leave `VITE_API_URL` unset for same-origin calls. Set optional `NASA_API_KEY` as a server environment variable. Pin `ASTROPULSE_MODEL_SHA256` to the chosen model artifact's SHA256 if release integrity checks are required. Allow additional browser origins only through `ASTROPULSE_CORS_ORIGINS` and a corresponding CSP update when deliberately using separate origins.
5. Deploy a preview and verify the checks below before promoting the release to the existing production domain.

The function configuration excludes raw data, the local virtual environment, documentation/evidence, frontend node_modules, and training/test code. Runtime dependencies and the model artifact remain included. Verify the actual generated bundle size, startup time, memory and inference latency in Vercel's build/function logs. The local model is small, but numerical-library dependencies dominate package size. Do not train on a request or during a production deployment.

The current source configuration follows [Vercel FastAPI](https://vercel.com/docs/frameworks/backend/fastapi) and [Python runtime](https://vercel.com/docs/functions/runtimes/python) documentation. A remote preview build has not been verified without an authenticated project connection. No claim is made that the public URL has already been updated.

## Container option

```sh
docker build -t astropulse .
docker run --rm -p 8000:8000 --env-file backend/.env astropulse
```

Omit `--env-file` if no optional configuration is needed. The multi-stage Dockerfile builds the frontend, installs the Python runtime, and runs the service as a non-root user. Its health check calls `/api/ready`. Docker must be installed to validate/build this path; a local Python run alone does not verify the image.

## Release verification

- `GET /` returns the AstroPulse interface, CSS/JS load, and the synthetic-data notice is visible.
- `GET /api/health` returns the application revision; `GET /api/ready` returns `status: ready`, the model version/digest and `inference_checked: true`.
- A browser request to `/api/ml/demo/crew-01?scenario=sleep_debt` returns 14 scored synthetic windows. The day-14 assessment shows `review`; day 1 shows `normal`.
- Moving the sandbox heart-rate slider to 180 preserves a critical group flag; setting RBC and WBC to their minima does not crash the page.
- After a successful online visit, offline reload works and model results say saved/cached. Reconnect and refresh before interpreting newly fetched data.
- DONKI empty/unavailable/stale states remain explicit. No crew dose is inferred.
- Verify CSP, frame protection, referrer policy, `nosniff`, and service-worker revalidation headers at the deployed edge.

Keep the source revision and model checksum together for rollback. This release uses a process-local NASA cache: each warm function/process has its own five-minute success cache and one-minute failure cooldown. That bounds ordinary requests within a process, not globally across serverless instances. Add a shared cache or edge rate limit if public traffic requires it.

CI is defined in `.github/workflows/ci.yml`. After it has run on GitHub, require its successful check through repository branch protection/rulesets. This account setting is not enabled merely by committing a workflow file. Select a software license with the team; no license decision or real-record medical-data architecture is made by this deployment configuration.
