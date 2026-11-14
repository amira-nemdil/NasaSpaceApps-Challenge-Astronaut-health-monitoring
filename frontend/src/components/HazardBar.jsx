const STYLE = {
  normal: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/60 bg-amber-400/15 text-amber-200",
  critical: "border-rose-500/70 bg-rose-500/15 text-rose-200",
};

const DOT = {
  normal: "bg-sky-400",
  warning: "bg-amber-400",
  critical: "animate-pulse bg-rose-400",
};

function HazardBar({ hazards = [] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-2xl bg-slate-900 p-3 text-white">
      {hazards.map((h) => (
        <div
          key={h.id}
          className={`flex min-w-37.5 flex-1 flex-col justify-center rounded-xl border px-3 py-2 ${STYLE[h.level] ?? STYLE.normal}`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[h.level] ?? DOT.normal}`} />
            {h.name}
          </div>
          <div className="mt-0.5 text-[11px] opacity-80">
            {h.detail ?? (h.level === "normal" ? "No threat" : h.level)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default HazardBar;