import { useEffect, useRef, useState } from "react";

const TYPES = {
  action: { label: "Action", dot: "bg-sky-400" },
  check: { label: "Check", dot: "bg-emerald-400" },
  alert: { label: "Alert", dot: "bg-amber-400" },
  ai: { label: "AI", dot: "bg-violet-400" },
  system: { label: "System", dot: "bg-slate-500" },
};

const LEVEL_TEXT = {
  normal: "text-slate-200",
  warning: "text-amber-300",
  critical: "text-rose-300",
};

function Log({ entries = [], onClear }) {
  const [hidden, setHidden] = useState({});
  const boxRef = useRef(null);
  const shown = entries.filter((e) => !hidden[e.type]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-white">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-sm font-semibold">Mission log</h2>

        {Object.entries(TYPES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => setHidden((h) => ({ ...h, [key]: !h[key] }))}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
              hidden[key]
                ? "bg-slate-800/50 text-slate-500 line-through"
                : "bg-slate-800 text-slate-200"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${t.dot}`} />
            {t.label}
          </button>
        ))}

        <span className="ml-auto text-xs text-slate-500">
          {shown.length} entries
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      <div
        ref={boxRef}
        className="h-44 overflow-y-auto rounded-xl bg-slate-950/60 p-2 font-mono text-xs"
      >
        {shown.length === 0 ? (
          <div className="p-2 text-slate-500">Nothing logged yet.</div>
        ) : (
          shown.map((e) => (
            <div
              key={e.id}
              className="flex gap-3 rounded px-2 py-1 hover:bg-slate-800/60"
            >
              <span className="w-20 shrink-0 text-slate-500">{e.clock}</span>
              <span className="flex w-16 shrink-0 items-start gap-1.5 text-slate-400">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TYPES[e.type]?.dot}`}
                />
                {TYPES[e.type]?.label}
              </span>
              <span
                className={`min-w-0 flex-1 break-words ${LEVEL_TEXT[e.level] ?? LEVEL_TEXT.normal}`}
              >
                {e.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Log;
