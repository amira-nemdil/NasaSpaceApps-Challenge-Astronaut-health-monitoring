// value -> 'normal' | 'warning' | 'critical'

const OPS = {
  '<': (v, t) => v < t,
  '<=': (v, t) => v <= t,
  '>': (v, t) => v > t,
  '>=': (v, t) => v >= t,
};

export function getLevel(metric, value) {
  if (metric.critical.some(([op, t]) => OPS[op](value, t))) return 'critical';
  const [lo, hi] = metric.normal;
  return value >= lo && value <= hi ? 'normal' : 'warning';
}
