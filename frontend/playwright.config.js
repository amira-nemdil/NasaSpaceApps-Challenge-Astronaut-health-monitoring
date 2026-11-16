import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const localPython = resolve('../.venv/Scripts/python.exe');
const python =
  process.env.PYTHON_EXECUTABLE ||
  (existsSync(localPython) ? localPython : 'python');
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:8011',
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROME_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE }
      : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `"${python}" -m uvicorn app:app --app-dir .. --host 127.0.0.1 --port 8011`,
    url: 'http://127.0.0.1:8011/api/ready',
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});
