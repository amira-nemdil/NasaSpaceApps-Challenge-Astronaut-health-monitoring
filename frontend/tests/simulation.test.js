import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METRICS, HAZARDS } from '../src/data.js';
import { getLevels, hazardLevels, getLevel } from '../src/status.js';
import {
  restoreSimulation,
  advanceSimulation,
  applyAction,
  missionClock,
} from '../src/simulation.js';

test('one critical reading cannot be hidden by normal associated readings', () => {
  const state = restoreSimulation(null);
  state.values.heartRate = 180;
  assert.equal(
    hazardLevels(HAZARDS, getLevels(METRICS, state.values)).radiation,
    'critical',
  );
});
test('both blood counts can be critical and every group reference exists', () => {
  assert.ok(
    HAZARDS.flatMap((h) => h.metrics).every((id) =>
      METRICS.some((m) => m.id === id),
    ),
  );
  const state = restoreSimulation(null);
  state.values.rbc = 1;
  state.values.wbc = 0;
  assert.equal(
    hazardLevels(HAZARDS, getLevels(METRICS, state.values)).isolation,
    'critical',
  );
});
test('missing readings are unknown and significant known flags are preserved', () => {
  assert.equal(getLevel(METRICS[0], NaN), 'unknown');
  assert.equal(
    hazardLevels([{ id: 'test', metrics: ['a', 'missing'] }], { a: 'normal' })
      .test,
    'unknown',
  );
  assert.equal(
    hazardLevels([{ id: 'test', metrics: ['a', 'missing'] }], { a: 'critical' })
      .test,
    'critical',
  );
});
test('24 mission hours per second advances a day and workload lowers HRV', () => {
  const start = { ...restoreSimulation(null), speed: 24, scenario: 'workload' };
  const next = advanceSimulation(start);
  assert.equal(missionClock(next.elapsedMinutes), 'Day 2 · 00:00');
  assert.ok(next.values.stress < start.values.stress);
});
test('rest rejects out of range inputs and tampered stored values are bounded', () => {
  const state = restoreSimulation(null);
  for (const invalid of [-1, 0, 13, 2.5, NaN, Infinity, ''])
    assert.throws(() => applyAction(state.values, 'rest', invalid));
  assert.equal(
    restoreSimulation({ values: { heartRate: Infinity }, scenario: 'bad' })
      .values.heartRate,
    70,
  );
  assert.equal(
    restoreSimulation({ values: { heartRate: 2000 } }).values.heartRate,
    180,
  );
});
test('active frontend alert content does not contain medication instructions', () => {
  const text = JSON.stringify(METRICS).toLowerCase();
  assert.doesNotMatch(
    text,
    /erythropoietin|antibiot|antiviral|probiotic|fasting/,
  );
});
