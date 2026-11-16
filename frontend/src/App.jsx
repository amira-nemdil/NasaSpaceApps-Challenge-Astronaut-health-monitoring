import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Body from './components/Body';
import Simulator from './components/Simulator';
import HazardBar from './components/HazardBar';
import MetricsPanel from './components/MetricsPanel';
import Log from './components/Log';
import MissionHealth from './components/MissionHealth';
import SpaceWeather from './components/SpaceWeather';
import { METRICS, HAZARDS, LOCATIONS } from './data.js';
import {
  getLevels,
  hazardLevels,
  partLevels,
  diffLevels,
  formatValue,
} from './status.js';
import {
  SCENARIOS,
  initialValues,
  clampMetric,
  restoreSimulation,
  advanceSimulation,
  applyAction,
  missionClock,
} from './simulation.js';
import { readStorage, writeStorage } from './storage.js';
import './App.css';

const metricById = Object.fromEntries(METRICS.map((m) => [m.id, m]));
const actions = [
  {
    id: 'rest',
    label: 'Simulate rest',
    category: 'routine',
    input: {
      default: 2,
      min: 1,
      max: 12,
      step: 1,
      unit: 'hours',
      label: 'Rest duration',
    },
  },
  { id: 'hydrate', label: 'Simulate hydration', category: 'routine' },
  { id: 'exercise', label: 'Simulate exercise', category: 'routine' },
  { id: 'check', label: 'Log a simulated check-in', category: 'measure' },
  {
    id: 'review',
    label: 'Log review request',
    category: 'response',
    description:
      'Records a demo request locally. No message is sent to a medical team.',
  },
];

function appendLog(state, items) {
  return {
    ...state,
    log: [
      ...state.log,
      ...items.map((entry) => ({
        id: crypto.randomUUID(),
        clock: new Date().toLocaleTimeString([], { hour12: false }),
        missionTime: missionClock(state.elapsedMinutes),
        ...entry,
      })),
    ].slice(-200),
  };
}

export default function App() {
  const [session, setSession] = useState(() =>
    restoreSimulation(readStorage('simulation')),
  );
  const [running, setRunning] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const { values, elapsedMinutes, scenario, speed, location, log } = session;
  const levels = useMemo(() => getLevels(METRICS, values), [values]);
  const hazardLv = useMemo(() => hazardLevels(HAZARDS, levels), [levels]);
  const partLv = useMemo(() => partLevels(METRICS, levels), [levels]);
  const prevLevels = useRef(levels);
  const pushLog = useCallback(
    (items) => setSession((previous) => appendLog(previous, items)),
    [],
  );

  useEffect(() => {
    const saved = writeStorage('simulation', session);
    // Storage is an external capability; report quota/private-mode failures.
    queueMicrotask(() => setStorageAvailable(saved));
  }, [session]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSession(advanceSimulation), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const changes = diffLevels(prevLevels.current, levels);
    prevLevels.current = levels;
    if (!changes.length) return;
    const entries = changes.map(({ id, to, up }) => {
      const metric = metricById[id];
      const text = `${metric.name}: ${to} (${formatValue(metric, values[id])}). ${up ? metric.advice[to] || 'Verify the input.' : 'Simulated reading updated.'}`;
      if (up) toast[to === 'critical' ? 'error' : 'warn'](text);
      return { type: up ? 'alert' : 'check', level: to, text };
    });
    pushLog(entries);
  }, [values, levels, pushLog]);

  function setValue(id, value) {
    if (!metricById[id] || !Number.isFinite(Number(value))) return;
    setSession((previous) => ({
      ...previous,
      values: { ...previous.values, [id]: clampMetric(id, Number(value)) },
    }));
  }
  function handleAction(id, amount) {
    try {
      const next = applyAction(values, id, amount);
      setSession((previous) =>
        appendLog({ ...previous, values: next }, [
          {
            type: id === 'review' ? 'review' : 'action',
            text:
              id === 'review'
                ? 'Simulated review request recorded locally; no message sent.'
                : id === 'check'
                  ? 'Simulated check-in recorded. No medical examination performed.'
                  : `${actions.find((a) => a.id === id)?.label} applied to demo values only.`,
          },
        ]),
      );
    } catch (error) {
      toast.error(error.message);
    }
  }
  const loc = LOCATIONS.find((l) => l.id === location);
  const chips = HAZARDS.map((h) => ({
    ...h,
    level: hazardLv[h.id],
    ...(h.id === 'distance'
      ? { detail: loc.distance, sub: `${loc.delay} one-way delay` }
      : {}),
  }));
  const details = Object.fromEntries(
    ['head', 'chest', 'heart', 'arms', 'legs'].map((part) => [
      part,
      METRICS.filter((m) => m.part === part).map((m) => ({
        id: m.id,
        name: m.name,
        value: formatValue(m, values[m.id]),
        level: levels[m.id],
      })),
    ]),
  );
  function exportLog() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              synthetic: true,
              exported_at: new Date().toISOString(),
              ...session,
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'astropulse-synthetic-session.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <a href="#mission-health" className="skip-link">
        Skip to mission health
      </a>
      <main className="space-app relative isolate min-h-screen bg-slate-950 p-4 text-white">
        <div className="space-backdrop" aria-hidden="true">
          <span className="space-planet space-planet--ringed" />
          <span className="space-planet space-planet--distant" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-5">
          <header className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-cyan-200 text-sm uppercase tracking-widest">
                InfinityDz · NASA Space Apps prototype
              </p>
              <h1 className="text-4xl font-bold mt-1">AstroPulse</h1>
            </div>
            <span className="state-badge state-watch">Synthetic demo</span>
          </header>
          <p className="rounded-xl border border-amber-400/60 bg-amber-950/50 p-4 text-amber-100">
            All crew identities and health readings are simulated. This
            educational prototype is not clinically validated, does not
            prescribe treatment, and must not be used for medical or
            flight-safety decisions. NASA does not endorse this project.
          </p>
          <MissionHealth />
          <SpaceWeather />
          <section aria-labelledby="sandbox-heading" className="grid gap-4">
            <div>
              <h2 id="sandbox-heading" className="text-2xl font-semibold">
                Interactive signal sandbox
              </h2>
              <p className="text-slate-300 mt-1">
                Explore illustrative thresholds below. This sandbox is
                independent of the crew dashboard and trained model above.
              </p>
            </div>
            <Simulator
              clock={missionClock(elapsedMinutes)}
              running={running}
              speed={speed}
              scenarios={SCENARIOS}
              scenario={scenario}
              actions={actions}
              onToggle={() => {
                setRunning(!running);
                pushLog([
                  {
                    type: 'system',
                    text: running ? 'Simulation paused' : 'Simulation started',
                  },
                ]);
              }}
              onReset={() => {
                setRunning(false);
                setSession((previous) =>
                  appendLog(
                    {
                      ...previous,
                      elapsedMinutes: 0,
                      speed: 1,
                      values: initialValues(),
                    },
                    [
                      {
                        type: 'system',
                        text: 'Simulation values and clock reset.',
                      },
                    ],
                  ),
                );
              }}
              onSpeed={(newSpeed) =>
                setSession((previous) => ({ ...previous, speed: newSpeed }))
              }
              onScenario={(newScenario) => {
                setRunning(false);
                setSession((previous) =>
                  appendLog(
                    {
                      ...previous,
                      scenario: newScenario,
                      elapsedMinutes: 0,
                      values: initialValues(),
                    },
                    [
                      {
                        type: 'system',
                        text: 'Sandbox scenario changed and values reset.',
                      },
                    ],
                  ),
                );
              }}
              onAction={handleAction}
            />
            <HazardBar
              hazards={chips}
              locations={LOCATIONS}
              location={location}
              onLocation={(id) =>
                setSession((previous) => ({ ...previous, location: id }))
              }
            />
            <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
              <div className="h-[500px]">
                <Body status={partLv} details={details} />
              </div>
              <MetricsPanel
                metrics={METRICS}
                values={values}
                onChange={setValue}
              />
            </div>
            <Log
              entries={log}
              onClear={() =>
                setSession((previous) => ({ ...previous, log: [] }))
              }
            />
            <div className="flex flex-wrap gap-3">
              <button className="health-button" onClick={exportLog}>
                Export synthetic session
              </button>
              <button
                className="health-button"
                onClick={() => {
                  setRunning(false);
                  setSession(restoreSimulation(null));
                }}
              >
                Clear saved sandbox session
              </button>
            </div>
            <p role="status" className="text-sm text-slate-300">
              {storageAvailable
                ? 'Synthetic sandbox values and the latest 200 log entries are saved on this device. Simulation pauses on reload.'
                : 'Device storage is unavailable. This session will not survive a reload.'}
            </p>
          </section>
          <footer className="text-slate-300 text-sm py-4">
            MMASH reference model · synthetic mission telemetry · NASA DONKI
            event context. Real medical records are not supported by this demo.
          </footer>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          limit={3}
          theme="dark"
        />
      </main>
    </>
  );
}
