import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

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

const now = () => new Date().toLocaleTimeString([], { hour12: false });

function notify(type, title, text) {
  toast[type](
    <div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs opacity-90">{text}</div>
    </div>,
  );
}

function App() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(METRICS.map((m) => [m.id, m.default])),
  );
  const [location, setLocation] = useState("station");
  const [log, setLog] = useState(() => [
    { id: 0, clock: now(), type: "system", text: "Monitoring started" },
  ]);
  const nextId = useRef(1);

  const setValue = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  const levels = useMemo(() => getLevels(METRICS, values), [values]);
  const hazardLv = useMemo(() => hazardLevels(HAZARDS, levels), [levels]);
  const partLv = useMemo(() => partLevels(METRICS, levels), [levels]);

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

  const pushLog = useCallback((items) => {
    const stamped = items.map((e) => ({
      id: nextId.current++,
      clock: now(),
      ...e,
    }));
    setLog((prev) => [...prev, ...stamped]);
  }, []);

  const prevLevels = useRef(levels);
  const prevHazards = useRef(hazardLv);

  useEffect(() => {
    const entries = [];

    for (const { id, to, up } of diffLevels(prevLevels.current, levels)) {
      const m = metricById[id];
      const reading = formatValue(m, values[id]);
      if (up) {
        const title = `${m.name} is ${to}`;
        notify(
          to === "critical" ? "error" : "warn",
          title,
          `${reading}. ${m.advice[to]}`,
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

    for (const { id, to, up } of diffLevels(prevHazards.current, hazardLv)) {
      const h = hazardById[id];
      const causes = h.metrics
        .filter((mid) => levels[mid] !== "normal")
        .map((mid) => metricById[mid].name)
        .join(", ");
      if (up) {
        if (to === "critical")
          notify(
            "error",
            `${h.name} hazard: critical`,
            `Triggered by: ${causes}`,
          );
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
      : { id: h.id, name: h.name, level: hazardLv[h.id] },
  );

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto grid max-w-7xl gap-4">
        <Simulator />
        <HazardBar
          hazards={hazardChips}
          locations={LOCATIONS}
          location={location}
          onLocation={changeLocation}
        />

        <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
          <Body status={partLv} details={details} />
          <MetricsPanel metrics={METRICS} values={values} onChange={setValue} />
        </div>

        <Log entries={log} onClear={() => setLog([])} />
      </div>

      <ToastContainer
        theme="dark"
        position="top-right"
        limit={4}
        autoClose={7000}
        newestOnTop
      />
    </main>
  );
}

export default App;
