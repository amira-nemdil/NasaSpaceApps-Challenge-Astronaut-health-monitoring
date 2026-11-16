import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('crew dashboard invokes the real model and follows scenario/day selection', async ({
  page,
}) => {
  const requests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/ml/')) requests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByTestId('model-percentile')).toBeVisible();
  await expect(page.getByTestId('overall-status')).toHaveText('normal');
  await page
    .getByLabel('Mission scenario', { exact: true })
    .selectOption('sleep_debt');
  await expect(page.getByTestId('overall-status')).toHaveText('review');
  await page
    .getByRole('button', { name: 'Show mission day 1', exact: true })
    .click();
  await expect(page.getByTestId('overall-status')).toHaveText('normal');
  await page.getByLabel('Crew member', { exact: true }).selectOption('crew-02');
  await expect(page.getByTestId('model-percentile')).toBeVisible();
  expect(
    requests.some((url) => url.includes('/crew-02?scenario=sleep_debt')),
  ).toBeTruthy();
});

test('critical signals remain visible and blood-count changes do not crash', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Resting heart rate', { exact: true }).press('End');
  await expect(page.getByTestId('signal-group-radiation')).toContainText(
    'Critical',
  );
  await page.getByLabel('Red blood cells', { exact: true }).press('Home');
  await page.getByLabel('White blood cells', { exact: true }).press('Home');
  await expect(page.getByTestId('signal-group-isolation')).toContainText(
    'Critical',
  );
  await expect(
    page.getByRole('heading', { name: 'AstroPulse', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await expect(page.locator('body')).not.toContainText('Erythropoietin');
});

test('clock units, HRV direction and rest input are correct', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Sandbox scenario').selectOption('workload');
  await page.getByRole('button', { name: '24x', exact: true }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByTestId('sandbox-clock')).toHaveText('Day 2 · 00:00');
  expect(
    Number(await page.getByLabel('HRV (RMSSD)', { exact: true }).inputValue()),
  ).toBeLessThan(55);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByLabel('Rest duration', { exact: true }).fill('-5');
  await expect(
    page.getByRole('button', { name: 'Simulate rest', exact: true }),
  ).toBeDisabled();
});

test('offline reload preserves sandbox state and identifies cached model results', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('model-percentile')).toBeVisible();
  await page.getByLabel('Resting heart rate', { exact: true }).press('End');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByLabel('Resting heart rate', { exact: true }),
  ).toHaveValue('180');
  await expect(page.getByTestId('overall-status')).toContainText('Saved');
  await expect(
    page.getByText(/no new offline inference is running/),
  ).toBeVisible();
});

test('unavailable API never manufactures a normal model result', async ({
  page,
}) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"detail":"unavailable"}',
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('overall-status')).toHaveText('unavailable');
  await expect(page.getByTestId('model-percentile')).toHaveCount(0);
  await expect(
    page.getByText(
      'The trained model is unavailable. Check the service connection and retry.',
    ),
  ).toBeVisible();
});

test('NASA failure is explicit and never fabricates events', async ({
  page,
}) => {
  await page.route('**/api/space-weather', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"available":false,"events":[],"error":"NASA feed unavailable. No events were invented."}',
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Load NASA space weather' }).click();
  await expect(
    page.getByText('NASA feed unavailable. No events were invented.', {
      exact: true,
    }),
  ).toBeVisible();
});

test('desktop/mobile controls pass automated accessibility checks', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('model-percentile')).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.html),
      })),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
