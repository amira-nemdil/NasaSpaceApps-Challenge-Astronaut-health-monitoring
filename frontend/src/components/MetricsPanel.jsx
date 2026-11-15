import { getLevel } from "../status.js";

const BADGE = {
  normal: "bg-sky-400/20 text-sky-200",
  warning: "bg-amber-400/20 text-amber-200",
  critical: "bg-rose-400/20 text-rose-200",
};

const ZONE = {
  normal: "bg-sky-400/70",
  warning: "bg-amber-400/70",
  critical: "bg-rose-500/70",
};

const SEGMENTS = 40;

const show = (metric, v) => (metric.id === "visionAcuity" ? `20/${v}` : v);

function ZoneStrip({ metric }) {
  const cells = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const v = metric.min + ((i + 0.5) / SEGMENTS) * (metric.max - metric.min);
    cells.push(
      <div key={i} className={`h-full flex-1 ${ZONE[getLevel(metric, v)]}`} />,
    );
  }
  return <div className="flex h-1.5 overflow-hidden rounded-full">{cells}</div>;
}

function MetricRow({ metric, value, onChange }) {
  const level = getLevel(metric, value);

  return (
    <div className="rounded-xl bg-slate-800/60 px-3 py-2.5">
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm text-slate-200">
          {metric.name}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm tabular-nums">
            {show(metric, value)}
            {metric.id !== "visionAcuity" && (
              <span className="ml-1 text-xs text-slate-500">{metric.unit}</span>
            )}
          </span>
          <span
            className={`w-16 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${BADGE[level]}`}
          >
            {level}
          </span>
          <button
            onClick={() => onChange(metric.id, metric.default)}
            title="Reset to default"
            className="rounded-md bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300 hover:bg-slate-600"
          >
            ↺
          </button>
        </div>
      </div>

      <input
        type="range"
        min={metric.min}
        max={metric.max}
        step={metric.step}
        value={value}
        onChange={(e) => onChange(metric.id, Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer accent-white"
      />
      <div className="mt-1">
        <ZoneStrip metric={metric} />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-500">
        <span>{show(metric, metric.min)}</span>
        <span>{show(metric, metric.max)}</span>
      </div>
    </div>
  );
}

function MetricsPanel({ metrics = [], values = {}, onChange }) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-slate-900 p-4 text-white">
      <h2 className="mb-3 shrink-0 text-sm font-semibold">Metrics</h2>

      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-2 md:grid-cols-2 2xl:grid-cols-3">
        {metrics.map((m) => (
          <MetricRow
            key={m.id}
            metric={m}
            value={values[m.id] ?? m.default}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

export default MetricsPanel;
