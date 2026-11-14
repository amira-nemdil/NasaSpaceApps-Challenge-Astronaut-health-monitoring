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

const LABEL = { normal: "Normal", warning: "Warning", critical: "Critical" };

function DistanceChip({ hazard, locations, location, onLocation }) {
  return (
    <div className="flex min-w-[150px] flex-1 flex-col justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-300">
      <div className="text-xs font-semibold">{hazard.name}</div>
      <div className="mt-0.5 font-mono text-sm text-white">{hazard.detail}</div>
      {hazard.sub && (
        <div className="text-[11px] text-slate-400">{hazard.sub}</div>
      )}

      {locations && (
        <div className="mt-2 flex gap-1">
          {locations.map((l) => (
            <button
              key={l.id}
              onClick={() => onLocation(l.id)}
              className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold ${
                l.id === location
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HazardBar({ hazards = [], locations, location, onLocation }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-2xl bg-slate-900 p-3 text-white">
      {hazards.map((h) =>
        h.id === "distance" ? (
          <DistanceChip
            key={h.id}
            hazard={h}
            locations={locations}
            location={location}
            onLocation={onLocation}
          />
        ) : (
          <div
            key={h.id}
            className={`flex min-w-[150px] flex-1 flex-col justify-center rounded-xl border px-3 py-2 ${STYLE[h.level] ?? STYLE.normal}`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${DOT[h.level] ?? DOT.normal}`}
              />
              {h.name}
            </div>
            <div className="mt-0.5 text-[11px] opacity-80">
              {LABEL[h.level] ?? LABEL.normal}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export default HazardBar;
