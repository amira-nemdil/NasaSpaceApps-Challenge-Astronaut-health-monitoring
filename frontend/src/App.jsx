
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Body from "./components/Body";
import Simulator from "./components/Simulator";
import HazardBar from "./components/HazardBar";
import MetricsPanel from "./components/MetricsPanel";
import Log from "./components/Log";

import { METRICS, HAZARDS, LOCATIONS } from "./data.js";
import {
  getLevels,
  hazardLevels,
  partLevels,
  diffLevels,
  formatValue,
} from "./status.js";

import "./App.css";

const metricById = Object.fromEntries(METRICS.map((m) => [m.id, m]));
const hazardById = Object.fromEntries(HAZARDS.map((h) => [h.id, h]));

const now = () =>
  new Date().toLocaleTimeString([], { hour12: false });

// ---------------- SCENARIOS ----------------

const SCENARIOS = [
  {
    id: "routine",
    label: "Routine mission",
    effects: {},
  },
  {
    id: "radiation",
    label: "Radiation exposure",
    effects: {
      headache: 0.15,
      sleepLoss: 0.2,
      stress: 1.5,
      energy: -1.5,
    },
  },
  {
    id: "isolation",
    label: "Isolation and confinement",
    effects: {
      sleepLoss: 0.25,
      stress: 1.5,
      energy: -1,
      wbc: 0.1,
    },
  },
  {
    id: "microgravity",
    label: "Microgravity effects",
    effects: {
      dizziness: 0.15,
      boneMuscleLoss: 0.1,
      energy: -1,
    },
  },
];

// ---------------- MANUAL ACTIONS ----------------

const ACTIONS = [
  {
    id: "rest",
    label: "Rest",
    category: "routine",
    input: {
      default: 2,
      min: 1,
      max: 12,
      step: 1,
      unit: "hours",
    },
  },
  {
    id: "hydrate",
    label: "Hydrate",
    category: "routine",
  },
  {
    id: "exercise",
    label: "Exercise",
    category: "routine",
  },
  {
    id: "check",
    label: "Medical check",
    category: "measure",
  },
  {
    id: "treatment",
    label: "Medical response",
    category: "response",
  },
];

// ---------------- HELPERS ----------------

function notify(type, title, text) {
  toast[type](
    <div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs opacity-90">{text}</div>
    </div>
  );
}

function createInitialValues() {
  return Object.fromEntries(METRICS.map((m) => [m.id, m.default]));
}

function clampMetric(id, value) {
  const metric = metricById[id];

  if (!metric) return value;

  return Math.min(metric.max, Math.max(metric.min, value));
}

function App() {
  // ---------------- MAIN STATE ----------------

  const [values, setValues] = useState(createInitialValues);

  const [location, setLocation] = useState("station");

  const [log, setLog] = useState(() => [
    {
      id: 0,
      clock: now(),
      type: "system",
      text: "Monitoring started",
    },
  ]);

  const nextId = useRef(1);

  // ---------------- SIMULATION STATE ----------------

  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scenario, setScenario] = useState("routine");

  const clock = (() => {
    const day = Math.floor(elapsedMinutes / 1440) + 1;
    const hours = Math.floor((elapsedMinutes % 1440) / 60);
    const minutes = elapsedMinutes % 60;

    return `Day ${day} · ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  })();

  // ---------------- LOGGING ----------------

  const pushLog = useCallback((items) => {
    const stamped = items.map((e) => ({
      id: nextId.current++,
      clock: now(),
      ...e,
    }));

    setLog((prev) => [...prev, ...stamped]);
  }, []);

  // ---------------- METRIC UPDATES ----------------

  const setValue = useCallback((id, value) => {
    setValues((prev) => ({
      ...prev,
      [id]: clampMetric(id, Number(value)),
    }));
  }, []);

  // ---------------- SIMULATION CLOCK ----------------

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setElapsedMinutes((prev) => prev + speed);

      const selectedScenario = SCENARIOS.find(
        (s) => s.id === scenario
      );

      setValues((prev) => {
        const next = { ...prev };

        for (const [id, rate] of Object.entries(
          selectedScenario?.effects ?? {}
        )) {
          const metric = metricById[id];

          if (!metric) continue;

          next[id] = clampMetric(
            id,
            prev[id] + (rate * speed) / 60
          );
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, speed, scenario]);

  // ---------------- SIMULATION CONTROLS ----------------

  const handleToggle = () => {
    setRunning((prev) => !prev);

    pushLog([
      {
        type: "system",
        text: running
          ? "Simulation paused"
          : "Simulation started",
      },
    ]);
  };

  const handleReset = () => {
    setRunning(false);
    setElapsedMinutes(0);
    setSpeed(1);
    setValues(createInitialValues());

    pushLog([
      {
        type: "system",
        text: "Simulation reset to default health values",
      },
    ]);
  };

  const handleSpeed = (newSpeed) => {
    setSpeed(newSpeed);

    pushLog([
      {
        type: "system",
        text: `Simulation speed changed to ${newSpeed}x`,
      },
    ]);
  };

  const handleScenario = (newScenario) => {
    setRunning(false);
    setScenario(newScenario);
    setElapsedMinutes(0);
    setValues(createInitialValues());

    const selected = SCENARIOS.find(
      (s) => s.id === newScenario
    );

    pushLog([
      {
        type: "system",
        text: `Scenario changed to ${selected?.label ?? newScenario}. Health values reset.`,
      },
    ]);
  };

  // ---------------- MANUAL ACTIONS ----------------

  const handleAction = (actionId, inputValue) => {
    const actionNames = {
      rest: "Rest",
      hydrate: "Hydration",
      exercise: "Exercise",
      check: "Medical check",
      treatment: "Medical response",
    };

    switch (actionId) {
      case "rest":
        setValues((prev) => ({
          ...prev,
          sleepLoss: clampMetric(
            "sleepLoss",
            prev.sleepLoss - inputValue * 0.5
          ),
          stress: clampMetric(
            "stress",
            prev.stress + 2
          ),
          energy: clampMetric(
            "energy",
            prev.energy + inputValue * 2
          ),
          headache: clampMetric(
            "headache",
            prev.headache - 1
          ),
        }));
        break;

      case "hydrate":
        setValues((prev) => ({
          ...prev,
          heartRate: clampMetric(
            "heartRate",
            prev.heartRate - 3
          ),
          headache: clampMetric(
            "headache",
            prev.headache - 1
          ),
          energy: clampMetric(
            "energy",
            prev.energy + 3
          ),
        }));
        break;

      case "exercise":
        setValues((prev) => ({
          ...prev,
          energy: clampMetric(
            "energy",
            prev.energy - 3
          ),
          stress: clampMetric(
            "stress",
            prev.stress - 2
          ),
          boneMuscleLoss: clampMetric(
            "boneMuscleLoss",
            prev.boneMuscleLoss - 1
          ),
        }));
        break;

      case "check":
        pushLog([
          {
            type: "check",
            text: "Medical check completed. Current health readings reviewed.",
          },
        ]);
        break;

      case "treatment":
        setValues((prev) => ({
          ...prev,
          headache: clampMetric(
            "headache",
            prev.headache - 2
          ),
          dizziness: clampMetric(
            "dizziness",
            prev.dizziness - 2
          ),
          stress: clampMetric(
            "stress",
            prev.stress + 5
          ),
          heartRate: clampMetric(
            "heartRate",
            prev.heartRate - 5
          ),
        }));
        break;

      default:
        return;
    }

    if (actionId !== "check") {
      pushLog([
        {
          type: "action",
          text: `${actionNames[actionId]} action performed`,
        },
      ]);
    }
  };

  // ---------------- HEALTH STATUS ----------------

  const levels = useMemo(
    () => getLevels(METRICS, values),
    [values]
  );

  const hazardLv = useMemo(
    () => hazardLevels(HAZARDS, levels),
    [levels]
  );

  const partLv = useMemo(
    () => partLevels(METRICS, levels),
    [levels]
  );

  const details = useMemo(() => {
    const out = {};

    for (const m of METRICS) {
      (out[m.part] ??= []).push({
        id: m.id,
        name: m.name,
        value: formatValue(m, values[m.id]),
        level: levels[m.id],
      });
    }

    return out;
  }, [values, levels]);

  // ---------------- AUTOMATIC ALERTS ----------------

  const prevLevels = useRef(levels);
  const prevHazards = useRef(hazardLv);

  useEffect(() => {
    const entries = [];

    for (const { id, to, up } of diffLevels(
      prevLevels.current,
      levels
    )) {
      const m = metricById[id];
      const reading = formatValue(m, values[id]);

      if (up) {
        const title = `${m.name} is ${to}`;

        notify(
          to === "critical" ? "error" : "warn",
          title,
          `${reading}. ${m.advice[to]}`
        );

        entries.push({
          type: "alert",
          level: to,
          text: `${title} (${reading}). ${m.advice[to]}`,
        });
      } else {
        entries.push({
          type: "check",
          level: to,
          text:
            to === "normal"
              ? `${m.name} back to normal (${reading})`
              : `${m.name} improved to ${to} (${reading})`,
        });
      }
    }

    for (const { id, to, up } of diffLevels(
      prevHazards.current,
      hazardLv
    )) {
      const h = hazardById[id];

      const causes = h.metrics
        .filter((mid) => levels[mid] !== "normal")
        .map((mid) => metricById[mid].name)
        .join(", ");

      if (up) {
        if (to === "critical") {
          notify(
            "error",
            `${h.name} hazard: critical`,
            `Triggered by: ${causes}`  ,
          );
        }

        entries.push({
          type: "alert",
          level: to,
          text: `Hazard ${h.name} is now ${to}. Triggered by: ${causes}`,
        });
      } else {
        entries.push({
          type: "check",
          level: to,
          text:
            to === "normal"
              ? `Hazard ${h.name} back to normal`
              : `Hazard ${h.name} eased to ${to}`,
        });
      }
    }

    prevLevels.current = levels;
    prevHazards.current = hazardLv;

    if (entries.length) pushLog(entries);
  }, [values, levels, hazardLv, pushLog]);

  // ---------------- LOCATION ----------------

  const changeLocation = (id) => {
    if (id === location) return;

    const loc = LOCATIONS.find((l) => l.id === id);

    setLocation(id);

    pushLog([
      {
        type: "system",
        text: `Location: ${loc.name} (${loc.distance}, ${loc.delay} one-way delay)`,
      },
    ]);
  };

  const loc = LOCATIONS.find((l) => l.id === location);

  const hazardChips = HAZARDS.map((h) =>
    h.id === "distance"
      ? {
          id: h.id,
          name: h.name,
          detail: loc.distance,
          sub: `${loc.delay} delay`,
        }
      : {
          id: h.id,
          name: h.name,
          level: hazardLv[h.id],
        }
  );

  // ---------------- UI ----------------

  return (
    <main className="space-app relative isolate min-h-screen bg-slate-950 p-4 text-white">
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-planet space-planet--ringed" />
        <span className="space-planet space-planet--distant" />
        <span className="space-planet space-planet--tiny" />
      </div>
      <div className="relative z-10 mx-auto grid max-w-7xl gap-4">

        <Simulator
          clock={clock}
          running={running}
          speed={speed}
          speeds={[1, 4, 12, 24]}
          scenarios={SCENARIOS}
          scenario={scenario}
          actions={ACTIONS}
          onToggle={handleToggle}
          onReset={handleReset}
          onSpeed={handleSpeed}
          onScenario={handleScenario}
          onAction={handleAction}
        />

        <HazardBar
          hazards={hazardChips}
          locations={LOCATIONS}
          location={location}
          onLocation={changeLocation}
        />

        <div className="grid min-h-0 items-stretch gap-4 lg:grid-cols-[340px_1fr]">
          <div className="h-[420px] min-h-0 lg:h-[480px]">
            <Body status={partLv} details={details} />
          </div>

          <div className="h-[420px] min-h-0 lg:h-[480px]">
            <MetricsPanel
              metrics={METRICS}
              values={values}
              onChange={setValue}
            />
          </div>
        </div>

        <Log
          entries={log}
          onClear={() => setLog([])}
        />

      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        theme="dark"
      />
    </main>
  );
}

export default App;
