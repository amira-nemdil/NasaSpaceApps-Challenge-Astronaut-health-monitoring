import { useEffect, useState } from 'react';
import { API_URL, fetchJSON } from '../api.js';
import { readStorage, writeStorage } from '../storage.js';

const scenarios = [
  ['nominal', 'Nominal'],
  ['sleep_debt', 'Sleep debt'],
  ['cardio_stress', 'Cardio stress'],
];
const badge = (value) =>
  `state-badge state-${['normal', 'watch', 'review'].includes(value) ? value : 'unavailable'}`;
function validTimeline(value, crewId, scenario) {
  if (
    value?.crew?.id !== crewId ||
    value.scenario !== scenario ||
    !Array.isArray(value.timeline) ||
    value.timeline.length !== 14
  )
    return false;
  const states = ['normal', 'watch', 'review'];
  const driversValid = (drivers) =>
    Array.isArray(drivers) &&
    drivers.every((driver) => typeof driver?.message === 'string');
  return value.timeline.every((row, index) => {
    if (value.synthetic === true) {
      const model = row?.model_output;
      return (
        row.mission_day === index + 1 &&
        states.includes(row.overall_status) &&
        model &&
        ['normal', 'watch'].includes(model.status) &&
        Number.isFinite(model.anomaly_score) &&
        model.anomaly_score >= 0 &&
        model.anomaly_score <= 1 &&
        Number.isFinite(model.threshold) &&
        model.threshold > 0 &&
        model.threshold <= 1 &&
        driversValid(model.drivers) &&
        typeof model.model_version === 'string' &&
        Number.isFinite(model.data_quality?.valid_heart_rate_fraction) &&
        row.model_input
      );
    }
    return (
      row?.day === index + 1 &&
      states.includes(row.status) &&
      ['heart_rate', 'sleep_hours', 'fatigue', 'mood'].every((name) =>
        Number.isFinite(row[name]),
      ) &&
      driversValid(row.drivers) &&
      typeof row.advice === 'string'
    );
  });
}

export default function MissionHealth() {
  const [crewId, setCrewId] = useState(() =>
    /^crew-0[123]$/.test(readStorage('mission-selection')?.crewId)
      ? readStorage('mission-selection').crewId
      : 'crew-01',
  );
  const [scenario, setScenario] = useState(() =>
    scenarios.some(([id]) => id === readStorage('mission-selection')?.scenario)
      ? readStorage('mission-selection').scenario
      : 'nominal',
  );
  const [day, setDay] = useState(() => {
    const saved = readStorage('mission-selection')?.day;
    return Number.isInteger(saved) && saved >= 1 && saved <= 14 ? saved : 14;
  });
  const [reviews, setReviews] = useState(() =>
    readStorage('mission-reviews', {}),
  );
  const [roster, setRoster] = useState(() =>
    readStorage(`roster:${API_URL}`, []),
  );
  const [result, setResult] = useState({});
  const [attempt, setAttempt] = useState(0);
  const key = `${API_URL}:${crewId}:${scenario}:${attempt}`;
  const reviewKey = `${crewId}:${scenario}:${day}`;

  useEffect(() => {
    writeStorage('mission-selection', { crewId, scenario, day });
  }, [crewId, scenario, day]);

  useEffect(() => {
    const controller = new AbortController();
    fetchJSON('/api/crew', controller.signal)
      .then((body) => {
        if (!Array.isArray(body.crew) || body.synthetic !== true)
          throw new Error('Invalid crew response.');
        setRoster(body.crew);
        writeStorage(`roster:${API_URL}`, body.crew);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const paths = [
        `/api/crew/${crewId}?scenario=${scenario}`,
        `/api/ml/demo/${crewId}?scenario=${scenario}`,
      ];
      const parts = await Promise.all(
        paths.map(async (path) => {
          const cacheKey = `response:${API_URL}:${path}`;
          try {
            if (!navigator.onLine) throw new Error('You are offline.');
            const value = await fetchJSON(path, controller.signal);
            if (!validTimeline(value, crewId, scenario))
              throw new Error(
                'The API response does not match the selected mission.',
              );
            if (path.includes('/ml/') && value.synthetic !== true)
              throw new Error('This demo only accepts synthetic data.');
            const savedAt = new Date().toISOString();
            writeStorage(cacheKey, { value, savedAt });
            return { value, savedAt, saved: false };
          } catch (error) {
            const cached = readStorage(cacheKey);
            if (validTimeline(cached?.value, crewId, scenario))
              return { ...cached, saved: true, error: error.message };
            return { error: error.message };
          }
        }),
      );
      if (!controller.signal.aborted)
        setResult({ key, mission: parts[0], demo: parts[1] });
    }
    load();
    return () => controller.abort();
  }, [crewId, scenario, key]);

  const current = result.key === key ? result : null;
  const mission = current?.mission?.value;
  const demo = current?.demo?.value;
  const daily = mission?.timeline[day - 1];
  const item = demo?.timeline[day - 1];
  const model = item?.model_output;
  const saved = current?.mission?.saved || current?.demo?.saved;
  const status = model && daily ? item.overall_status : 'unavailable';
  const savedAt = current?.demo?.savedAt || current?.mission?.savedAt;
  return (
    <section
      id="mission-health"
      className="health-panel"
      aria-labelledby="health-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="health-heading">Mission health</h2>
          <p className="text-slate-400">
            Personal baselines and MMASH model results · synthetic 14-day
            mission
          </p>
        </div>
        <span className={badge(status)} data-testid="overall-status">
          {!current ? 'Loading' : saved ? `Saved · ${status}` : status}
        </span>
      </div>
      <div className="health-controls">
        <label>
          <span id="crew-label">Crew member</span>
          <select
            aria-labelledby="crew-label"
            value={crewId}
            onChange={(e) => setCrewId(e.target.value)}
          >
            {Array.isArray(roster) && roster.length ? (
              roster.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))
            ) : (
              <option value="crew-01">Crew 01 — awaiting service</option>
            )}
          </select>
        </label>
        <label>
          <span id="mission-scenario-label">Mission scenario</span>
          <select
            aria-labelledby="mission-scenario-label"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {scenarios.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mission day: {day}
          <input
            type="range"
            min="1"
            max="14"
            value={day}
            aria-valuetext={`Mission day ${day}`}
            onChange={(e) => setDay(Number(e.target.value))}
          />
        </label>
      </div>
      <p role="status" className="text-slate-300">
        {!current
          ? 'Loading the mission and trained model…'
          : saved
            ? `Showing saved synthetic results from ${new Date(savedAt).toLocaleString()}. These are cached scores; no new offline inference is running.`
            : model
              ? 'Connected to the trained model service.'
              : 'Model unavailable. No model status has been inferred.'}
      </p>
      {current && (!mission || !model) && (
        <p role="alert">
          {current.demo?.error || current.mission?.error} Check the service
          connection and retry.
        </p>
      )}
      <button
        className="health-button mt-3"
        onClick={() => setAttempt((n) => n + 1)}
      >
        Refresh mission data
      </button>
      {daily && (
        <div className="mt-3">
          <button
            className="health-button"
            onClick={() => {
              const next = {
                ...reviews,
                [reviewKey]: new Date().toISOString(),
              };
              setReviews(next);
              writeStorage('mission-reviews', next);
            }}
          >
            Record demo review
          </button>
          <p className="text-sm text-slate-300">
            {reviews[reviewKey]
              ? `Review recorded on this device at ${new Date(reviews[reviewKey]).toLocaleString()}. Flags remain visible; no message was sent.`
              : 'Record a review locally without clearing active flags or sending a medical request.'}
          </p>
        </div>
      )}
      {daily && (
        <>
          <div className="health-stats">
            {[
              ['Resting heart rate', `${daily.heart_rate} bpm`],
              ['Sleep', `${daily.sleep_hours} h`],
              ['Fatigue (self-report)', `${daily.fatigue}/10`],
              ['Mood (self-report)', `${daily.mood}/5`],
            ].map(([label, value]) => (
              <div className="health-stat" key={label}>
                {label}
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="day-timeline" aria-label="Mission status by day">
            {mission.timeline.map((row, index) => (
              <button
                key={row.day}
                aria-label={`Show mission day ${row.day}`}
                aria-pressed={day === row.day}
                className={badge(
                  demo?.timeline[index]?.overall_status || row.status,
                )}
                onClick={() => setDay(row.day)}
              >
                {row.day}
              </button>
            ))}
          </div>
          <div className="health-details">
            <article>
              <h3 className="font-semibold">Personal baseline assessment</h3>
              <span className={badge(daily.status)}>{daily.status}</span>
              <p className="text-slate-300 mt-2">
                Reference period: mission days 1–7. Each daily reading is
                compared independently.
              </p>
              <ul>
                {daily.drivers.length ? (
                  daily.drivers.map((driver) => (
                    <li key={driver.field}>{driver.message}</li>
                  ))
                ) : (
                  <li>
                    No significant deviation from the simulated personal
                    baseline.
                  </li>
                )}
              </ul>
              <p>{daily.advice}</p>
            </article>
            <article>
              <h3 className="font-semibold">Wearable anomaly model</h3>
              {model ? (
                <>
                  <p>
                    <strong data-testid="model-percentile">
                      {(model.anomaly_score * 100).toFixed(1)}th percentile
                    </strong>{' '}
                    of reference rarity
                  </p>
                  <p>
                    Threshold: {(model.threshold * 100).toFixed(0)}th percentile
                    ·{' '}
                    <span className={badge(model.status)}>{model.status}</span>
                  </p>
                  <p className="text-slate-300">
                    This measures statistical rarity. Medical detection accuracy
                    is unverified.
                  </p>
                  <ul>
                    {model.drivers.length ? (
                      model.drivers.map((driver) => (
                        <li key={driver.feature}>{driver.message}</li>
                      ))
                    ) : (
                      <li>
                        No large feature deviations from the MMASH reference.
                      </li>
                    )}
                  </ul>
                  <p className="text-sm">
                    {model.model_version} · {model.window_minutes}-minute window
                    ·{' '}
                    {(
                      model.data_quality.valid_heart_rate_fraction * 100
                    ).toFixed(0)}
                    % valid heart-rate coverage
                  </p>
                  <details className="mt-2">
                    <summary>Model input and explanation limits</summary>
                    <pre className="overflow-x-auto text-xs mt-2">
                      {JSON.stringify(item.model_input, null, 2)}
                    </pre>
                    <p>{model.explanation_method}</p>
                  </details>
                </>
              ) : (
                <p>
                  Unavailable — the baseline remains visible while the model
                  service is unavailable.
                </p>
              )}
            </article>
          </div>
          <p className="text-slate-400 mt-4 text-sm">
            {mission.data_source}. The model reference contains 22 healthy
            terrestrial participants, not astronaut measurements. Blood counts,
            microbiome, vision and bone-loss sliders below are outside the
            model.
          </p>
        </>
      )}
    </section>
  );
}
