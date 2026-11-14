const OPS = {
  '<': (v, t) => v < t,
  '<=': (v, t) => v <= t,
  '>': (v, t) => v > t,
  '>=': (v, t) => v >= t,
};

export const RANK = { normal: 0, warning: 1, critical: 2 };

export function getLevel(metric, value) {
  if (metric.critical.some(([op, t]) => OPS[op](value, t))) return 'critical';
  const [lo, hi] = metric.normal;
  return value >= lo && value <= hi ? 'normal' : 'warning';
}

export const worst = (levels) => levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'normal');

export const lowest = (levels) =>
  levels.length ? levels.reduce((a, b) => (RANK[b] < RANK[a] ? b : a)) : 'normal';

export const getLevels = (metrics, values) =>
  Object.fromEntries(metrics.map((m) => [m.id, getLevel(m, values[m.id])]));

export const hazardLevels = (hazards, levels) =>
  Object.fromEntries(hazards.map((h) => [h.id, lowest(h.metrics.map((id) => levels[id]))]));

export function partLevels(metrics, levels) {
  const out = { head: 'normal', chest: 'normal', heart: 'normal', arms: 'normal', legs: 'normal' };
  for (const m of metrics) out[m.part] = worst([out[m.part], levels[m.id]]);
  return out;
}

export function diffLevels(prev, next) {
  return Object.keys(next)
    .filter((id) => prev[id] !== next[id])
    .map((id) => ({ id, from: prev[id], to: next[id], up: RANK[next[id]] > RANK[prev[id]] }));
}

export const formatValue = (metric, value) =>
  metric.id === 'visionAcuity' ? `20/${value}` : `${value} ${metric.unit}`;