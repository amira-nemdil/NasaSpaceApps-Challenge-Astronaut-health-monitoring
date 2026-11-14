
const STYLE = {
  normal: "border-emerald-500/30 bg-emerald-500/10",
  warning: "border-amber-400/40 bg-amber-400/10",
  critical: "border-rose-500/50 bg-rose-500/10",
};

const DOT = {
  normal: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "animate-pulse bg-rose-400",
};

const LABEL = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
};

function DistanceChip({ hazard, locations, location, onLocation }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-100">
          {hazard.name}
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          {hazard.detail}
        </p>

        {hazard.sub && (
          <p className="mt-1 text-xs text-slate-500">
            {hazard.sub}
          </p>
        )}
      </div>

      {locations && (
        <div className="grid grid-cols-3 gap-2">
          {locations.map((l) => {
            const active = l.id === location;

            return (
              <button
                key={l.id}
                onClick={() => onLocation(l.id)}
                aria-pressed={active}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-sky-400 text-slate-950 shadow-sm"
                    : "bg-slate-700/70 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {l.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HazardBar({ hazards = [], locations, location, onLocation }) {
  const hazardItems = hazards.filter((h) => h.id !== "distance");
  const distance = hazards.find((h) => h.id === "distance");

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-white">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-base font-bold tracking-tight text-slate-100">
          Environmental Hazards
        </h2>

        <p className="mt-0.5 text-xs text-slate-400">
          Current spaceflight environment status
        </p>
      </div>

      {/* Hazard cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {hazardItems.map((h) => {
          const level = STYLE[h.level] ? h.level : "normal";

          return (
            <div
              key={h.id}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors ${STYLE[level]}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[level]}`}
                />

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100">
                    {h.name}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Environmental condition
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-slate-950/40 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {LABEL[level]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Distance selector */}
      {distance && (
        <div className="mt-3">
          <DistanceChip
            hazard={distance}
            locations={locations}
            location={location}
            onLocation={onLocation}
          />
        </div>
      )}
    </section>
  );
}

export default HazardBar;
