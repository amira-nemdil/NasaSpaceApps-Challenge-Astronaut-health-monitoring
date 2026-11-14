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
    cells.push(<div key={i} className={`h-full flex-1 ${ZONE[getLevel(metric, v)]}`} />);
  }
  return <div className="flex h-1.5 overflow-hidden rounded-full">{cells}</div>;
}

function MetricRow({ metric, value, onChange }) {
  const level = getLevel(metric, value);

  return (
    <div className="rounded-xl bg-slate-800/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-200">{metric.name}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums">
            {show(metric, value)}
            {metric.id !== "visionAcuity" && <span className="ml-1 text-xs text-slate-500">{metric.unit}</span>}
          </span>
          <span className={`w-16 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${BADGE[level]}`}>
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

function LocationPicker({ locations, location, onLocation }) {
  const current = locations.find((l) => l.id === location);
  return (
    <div className="rounded-xl bg-slate-800/60 px-3 py-2.5">
      <div className="mb-2 text-sm text-slate-200">Distance from Earth</div>
      <div className="flex gap-2">
        {locations.map((l) => (
          <button
            key={l.id}
            onClick={() => onLocation(l.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
              l.id === location ? "bg-sky-400 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>
      {current && (
        <div className="mt-2 font-mono text-[11px] text-slate-400">
          {current.distance} · {current.delay} one-way delay
        </div>
      )}
    </div>
  );
}

function MetricsPanel({ metrics = [], values = {}, hazards, locations, location, onChange, onLocation }) {
  const groups = hazards
    ? hazards
        .map((h) => ({ id: h.id, title: h.name, list: metrics.filter((m) => h.metrics.includes(m.id)) }))
        .filter((g) => g.list.length)
    : [{ id: "all", title: null, list: metrics }];

  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-white">
      <h2 className="mb-3 text-sm font-semibold">Metrics</h2>

      <div className="max-h-130 space-y-4 overflow-y-auto pr-1">
        {locations && (
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-400">Mission location</div>
            <LocationPicker locations={locations} location={location} onLocation={onLocation} />
          </div>
        )}

        {groups.map((g) => (
          <div key={g.id}>
            {g.title && (
              <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-400">{g.title}</div>
            )}
            <div className="space-y-2">
              {g.list.map((m) => (
                <MetricRow key={m.id} metric={m} value={values[m.id] ?? m.default} onChange={onChange} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetricsPanel;