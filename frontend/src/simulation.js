import { METRICS, LOCATIONS } from './data.js';
export const SCENARIOS = [
  { id: 'routine', label: 'Routine mission', effects: {} },
  {
    id: 'workload',
    label: 'Increased workload (illustrative)',
    effects: { headache: 0.15, sleepLoss: 0.2, stress: -1.5, energy: -1.5 },
  },
  {
    id: 'isolation',
    label: 'Isolation scenario (illustrative)',
    effects: { sleepLoss: 0.25, stress: -1.5, energy: -1 },
  },
  {
    id: 'microgravity',
    label: 'Movement changes (illustrative)',
    effects: { dizziness: 0.15, boneMuscleLoss: 0.1, energy: -1 },
  },
];
export function clampMetric(id, value) {
  const metric = METRICS.find((m) => m.id === id);
  if (!metric || !Number.isFinite(value)) return metric?.default;
  return Number(Math.min(metric.max, Math.max(metric.min, value)).toFixed(4));
}
export const initialValues = () =>
  Object.fromEntries(METRICS.map((m) => [m.id, m.default]));
export function restoreSimulation(saved) {
  return {
    values: Object.fromEntries(
      METRICS.map((m) => [
        m.id,
        clampMetric(m.id, saved?.values?.[m.id] ?? m.default),
      ]),
    ),
    elapsedMinutes:
      Number.isSafeInteger(saved?.elapsedMinutes) && saved.elapsedMinutes >= 0
        ? saved.elapsedMinutes
        : 0,
    speed: [1, 4, 12, 24].includes(saved?.speed) ? saved.speed : 1,
    scenario: SCENARIOS.some((s) => s.id === saved?.scenario)
      ? saved.scenario
      : 'routine',
    location: LOCATIONS.some((l) => l.id === saved?.location)
      ? saved.location
      : 'station',
    log: Array.isArray(saved?.log)
      ? saved.log
          .filter(
            (e) => e && typeof e.text === 'string' && typeof e.id === 'string',
          )
          .slice(-200)
      : [],
  };
}
export function advanceSimulation(state) {
  const effects = SCENARIOS.find((s) => s.id === state.scenario)?.effects ?? {};
  return {
    ...state,
    elapsedMinutes: state.elapsedMinutes + state.speed * 60,
    values: Object.fromEntries(
      METRICS.map((m) => [
        m.id,
        clampMetric(
          m.id,
          state.values[m.id] + (effects[m.id] ?? 0) * state.speed,
        ),
      ]),
    ),
  };
}
export function applyAction(values, action, amount) {
  if (
    action === 'rest' &&
    (!Number.isInteger(amount) || amount < 1 || amount > 12)
  )
    throw new Error('Rest hours must be a whole number between 1 and 12.');
  const deltas =
    {
      rest: {
        sleepLoss: -amount * 0.5,
        stress: 2,
        energy: amount * 2,
        headache: -1,
      },
      hydrate: { heartRate: -3, headache: -1, energy: 3 },
      exercise: { energy: -3, stress: 2, boneMuscleLoss: -1 },
    }[action] ?? {};
  return Object.fromEntries(
    METRICS.map((m) => [
      m.id,
      clampMetric(m.id, values[m.id] + (deltas[m.id] ?? 0)),
    ]),
  );
}
export function missionClock(minutes) {
  return `Day ${Math.floor(minutes / 1440) + 1} · ${String(Math.floor((minutes % 1440) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
