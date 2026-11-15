import { useState } from "react";

/* ---------- Config ---------- */

const defaultStatus = {
  head: "normal",
  chest: "normal",
  heart: "warning",
  arms: "normal",
  legs: "critical",
};

const statusColors = {
  normal: { edge: "#0ea5e9", inner: "#67e8f9" },
  warning: { edge: "#f59e0b", inner: "#fde047" },
  critical: { edge: "#e11d48", inner: "#fda4af" },
};

const statusLabels = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
};

const partLabels = {
  head: "Head",
  chest: "Chest",
  heart: "Heart",
  arms: "Arms",
  legs: "Legs",
};

const beatSpeed = { normal: "1.2s", warning: "0.8s", critical: "0.5s" };

/* ---------- Shapes ---------- */

const HEAD_D =
  "M150 16 C170 16 180 34 179 54 C178 72 168 84 160 88 L160 98 L140 98 L140 88 C132 84 122 72 121 54 C120 34 130 16 150 16 Z";

const CHEST_D =
  "M142 98 L158 98 C174 101 194 105 204 118 C207 142 199 176 195 206 C192 230 195 250 198 268 C180 278 120 278 102 268 C105 250 108 230 105 206 C101 176 93 142 96 118 C106 105 126 101 142 98 Z";

const ARM_D =
  "M100 112 C86 112 78 124 76 142 C72 172 68 202 64 230 C60 256 56 282 52 308 C50 320 50 332 54 342 C60 350 70 346 72 338 C74 322 78 300 84 276 C90 250 95 226 98 205 C100 180 102 150 102 124 C102 118 101 114 100 112 Z";

const LEG_D =
  "M105 282 C101 315 101 350 106 388 C109 410 107 435 111 462 C113 482 112 494 110 506 C104 516 100 530 114 534 C128 536 140 533 140 522 C138 510 136 498 137 484 C140 456 144 420 144 392 C147 356 148 318 147 282 Z";

const HEART_D =
  "M0 22 C-26 4 -22 -20 -8 -20 C-3 -20 0 -16 0 -12 C0 -16 3 -20 8 -20 C22 -20 26 4 0 22 Z";

/* ---------- One body part: soft fill + glowing outline ---------- */

function Part({
  partKey,
  d,
  transform,
  status,
  hovered,
  selected,
  onHover,
  onSelect,
  baseOpacity = 0.18,
  className,
  extraStyle,
}) {
  const { edge, inner } = statusColors[status];
  const active = hovered || selected;

  return (
    <g
      className={className}
      onMouseEnter={() => onHover(partKey)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(partKey)}
      style={{
        cursor: "pointer",
        transition: "filter 0.2s",
        filter: active
          ? `drop-shadow(0 0 10px ${edge})`
          : `drop-shadow(0 0 4px ${edge}99)`,
        ...extraStyle,
      }}
    >
      <path
        d={d}
        transform={transform}
        fill={edge}
        fillOpacity={active ? baseOpacity + 0.2 : baseOpacity}
        stroke={selected ? inner : edge}
        strokeWidth={selected ? 3 : 2}
        strokeLinejoin="round"
        style={{ transition: "fill-opacity 0.2s" }}
      />
    </g>
  );
}

/* ---------- Component ---------- */

function Body({ status = defaultStatus, details = {} }) {
  const bodyStatus = status;
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const common = (key) => ({
    partKey: key,
    status: bodyStatus[key],
    hovered: hovered === key,
    selected: selected === key,
    onHover: setHovered,
    onSelect: setSelected,
  });

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-slate-900 p-4 text-white">
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.18); }
          30% { transform: scale(1); }
          45% { transform: scale(1.1); }
          60% { transform: scale(1); }
        }
        .heart-beat {
          transform-box: fill-box;
          transform-origin: center;
          animation: heartbeat var(--beat, 1.2s) ease-in-out infinite;
        }
      `}</style>

      <h2 className="mb-2 shrink-0 text-center text-lg font-semibold">
  Astronaut Body Monitoring
</h2>

      <div className="flex min-h-0 flex-1 justify-center">
  <svg
    viewBox="0 0 300 550"
    className="h-full w-full max-w-[260px]"
    preserveAspectRatio="xMidYMid meet"
  >
          {/* Legs */}
          <Part {...common("legs")} d={LEG_D} />
          <Part
            {...common("legs")}
            d={LEG_D}
            transform="translate(300 0) scale(-1 1)"
          />

          {/* Arms */}
          <Part {...common("arms")} d={ARM_D} transform="translate(-8 0)" />
          <Part
            {...common("arms")}
            d={ARM_D}
            transform="translate(308 0) scale(-1 1)"
          />

          {/* Chest */}
          <Part {...common("chest")} d={CHEST_D} />

          {/* Head */}
          <Part {...common("head")} d={HEAD_D} />

          {/* Heart (beating) */}
          <Part
            {...common("heart")}
            d={HEART_D}
            transform="translate(158 168)"
            baseOpacity={0.45}
            className="heart-beat"
            extraStyle={{ "--beat": beatSpeed[bodyStatus.heart] }}
          />
        </svg>
      </div>

      {/* Selected part info */}
      <div className="mt-2 min-h-[56px] shrink-0 rounded-xl bg-slate-800 px-3 py-2 text-sm">
        {selected ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{partLabels[selected]}</span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-slate-900"
                style={{ background: statusColors[bodyStatus[selected]].inner }}
              >
                {statusLabels[bodyStatus[selected]]}
              </span>
            </div>
            {details[selected]?.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-300">
                {details[selected].map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{d.name}</span>
                    <span className="flex items-center gap-2 font-mono">
                      {d.value}
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: statusColors[d.level].edge }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <span className="text-slate-400">
            Click a body part to see its status.
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex shrink-0 flex-wrap justify-center gap-3 text-xs">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-sky-400" />
          Normal
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          Warning
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          Critical
        </span>
      </div>
    </div>
  );
}

export default Body;
