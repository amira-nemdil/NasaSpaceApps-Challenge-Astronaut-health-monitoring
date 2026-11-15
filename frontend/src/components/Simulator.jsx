import { useState } from "react";

const GROUPS = [
  {
    key: "routine",
    title: "Routine",
    border: "border-emerald-400",
    text: "text-emerald-300",
  },
  {
    key: "measure",
    title: "Measure",
    border: "border-sky-400",
    text: "text-sky-300",
  },
  {
    key: "response",
    title: "Respond",
    border: "border-rose-400",
    text: "text-rose-300",
  },
];

function ActionButton({ action, onAction }) {
  const { input } = action;
  const [value, setValue] = useState(input?.default);

  return (
    <div className="rounded-lg bg-slate-800 p-2">
      <button
        onClick={() => onAction(action.id, value)}
        className="w-full rounded-md bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/40"
      >
        {action.label}
      </button>

      {action.description && (
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-slate-400">
          {action.description}
        </p>
      )}

      {input && (
        <label className="mt-2 flex items-center justify-between gap-2 px-1 text-xs text-slate-400">
          <span>{input.label || "Amount"}</span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={input.min}
              max={input.max}
              step={input.step}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-16 rounded bg-slate-900 px-2 py-1 text-white"
            />
            {input.unit}
          </span>
        </label>
      )}
    </div>
  );
}

function ControlLabel({ children }) {
  return (
    <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">
      {children}
    </div>
  );
}

function Simulator({
  clock,
  running,
  speed,
  speeds = [1, 4, 12, 24],
  scenarios = [],
  scenario,
  actions = [],
  onToggle,
  onReset,
  onSpeed,
  onScenario,
  onAction,
}) {
  return (
    <section className="space-y-5 rounded-2xl bg-slate-900 p-5 text-white">
      {/* Title + one-line explanation */}
      <header>
        <h2 className="text-lg font-semibold">Mission Simulator</h2>
        
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-xl bg-slate-800/50 p-4">
        <div>
          <ControlLabel>Mission clock</ControlLabel>
          <div className="font-mono text-2xl font-semibold tabular-nums">
            {clock}
          </div>
        </div>

        <div>
          <ControlLabel>Simulation</ControlLabel>
          <div className="flex gap-2">
            <button
              onClick={onToggle}
              className={`w-24 rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 ${
                running
                  ? "bg-amber-400 hover:bg-amber-300"
                  : "bg-emerald-400 hover:bg-emerald-300"
              }`}
            >
              {running ? "Pause" : "Run"}
            </button>
            <button
              onClick={onReset}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Reset
            </button>
          </div>
        </div>

        <div>
          <ControlLabel>Speed (mission hours per second)</ControlLabel>
          <div className="flex gap-1">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onSpeed(s)}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  speed === s
                    ? "bg-sky-400 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="md:ml-auto">
          <ControlLabel>Scenario</ControlLabel>
          <select
            value={scenario}
            onChange={(e) => onScenario(e.target.value)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions, one column per category */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {GROUPS.map((g) => {
          const list = actions.filter((a) => a.category === g.key);
          if (!list.length) return null;

          return (
            <div
              key={g.key}
              className={`min-w-0 rounded-xl border-t-2 bg-slate-800/40 p-3 ${g.border}`}
            >
              <h3
                className={`text-xs font-semibold uppercase tracking-widest ${g.text}`}
              >
                {g.title}
              </h3>
              <p className="mb-3 mt-1 text-xs text-slate-400">{g.hint}</p>

              <div className="flex flex-col gap-2">
                {list.map((a) => (
                  <ActionButton key={a.id} action={a} onAction={onAction} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Simulator;