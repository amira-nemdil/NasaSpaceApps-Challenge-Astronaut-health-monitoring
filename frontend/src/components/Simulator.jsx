import { useState } from "react";

const GROUPS = [
  { key: "routine", title: "Routine" },
  { key: "measure", title: "Measure" },
  { key: "response", title: "Respond" },
];

function ActionButton({ action, onAction }) {
  const { input } = action;
  const [value, setValue] = useState(input?.default);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-2 py-1.5">
      <button
        onClick={() => onAction(action.id, value)}
        className="rounded-md bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-500/40"
      >
        {action.label}
      </button>
      {input && (
        <label className="flex items-center gap-1 text-xs text-slate-400">
          <input
            type="number"
            min={input.min}
            max={input.max}
            step={input.step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-14 rounded bg-slate-900 px-1.5 py-0.5 text-white"
          />
          {input.unit}
        </label>
      )}
    </div>
  );
}

function Simulator({
  clock, running, speed, speeds = [1, 4, 12, 24], scenarios = [], scenario,
  actions = [], onToggle, onReset, onSpeed, onScenario, onAction,
}) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-white">
      {/* Row 1: clock + controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Mission clock</div>
          <div className="font-mono text-2xl font-semibold tabular-nums">{clock}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`w-24 rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 ${
              running ? "bg-amber-400 hover:bg-amber-300" : "bg-emerald-400 hover:bg-emerald-300"
            }`}
          >
            {running ? "Pause" : "Run"}
          </button>
          <button onClick={onReset} className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            Reset
          </button>
        </div>

        {/* Speed: simulated hours per real second */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          Speed
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`rounded-md px-2 py-1 font-semibold ${
                speed === s ? "bg-sky-400 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <select
          value={scenario}
          onChange={(e) => onScenario(e.target.value)}
          className="ml-auto rounded-lg bg-slate-800 px-3 py-2 text-sm"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Row 2: action buttons grouped by category */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {GROUPS.map((g) => {
          const list = actions.filter((a) => a.category === g.key);
          if (!list.length) return null;
          return (
            <div key={g.key}>
              <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-400">{g.title}</div>
              <div className="flex flex-wrap gap-2">
                {list.map((a) => (
                  <ActionButton key={a.id} action={a} onAction={onAction} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Simulator;
