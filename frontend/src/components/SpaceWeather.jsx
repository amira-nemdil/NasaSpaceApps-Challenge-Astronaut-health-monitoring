import { useState } from 'react';
import { fetchJSON, API_URL } from '../api.js';
import { readStorage, writeStorage } from '../storage.js';

export default function SpaceWeather() {
  const [result, setResult] = useState(() => {
    const saved = readStorage(`weather:${API_URL}`);
    return saved ? { ...saved, stale: true } : null;
  });
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const body = await fetchJSON(
        '/api/space-weather',
        new AbortController().signal,
      );
      if (!Array.isArray(body.events) || typeof body.available !== 'boolean')
        throw new Error('Unexpected NASA feed response.');
      setResult(body);
      if (body.available) writeStorage(`weather:${API_URL}`, body);
    } catch {
      setResult((previous) =>
        previous?.available
          ? {
              ...previous,
              stale: true,
              error: 'Connection unavailable; showing saved reports.',
            }
          : {
              available: false,
              events: [],
              error: 'NASA feed unavailable. No events were invented.',
            },
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="health-panel" aria-labelledby="weather-heading">
      <h2 id="weather-heading">NASA space-weather context</h2>
      <p className="text-slate-300">
        DONKI solar energetic particle event reports. These do not measure
        astronaut radiation dose or crew health risk.
      </p>
      <button className="health-button mt-3" onClick={load} disabled={loading}>
        {loading ? 'Loading NASA reports…' : 'Load NASA space weather'}
      </button>
      <div role="status" className="mt-3">
        {result ? (
          <>
            <p>
              {result.stale ? 'Saved / stale reports. ' : ''}
              {result.error ||
                (result.available
                  ? result.events.length
                    ? `${result.events.length} reported events.`
                    : 'No reported SEP events in the requested window.'
                  : 'NASA feed unavailable.')}
            </p>
            {result.fetched_at && (
              <p className="text-slate-400 text-sm">
                Retrieved {new Date(result.fetched_at).toLocaleString()}
              </p>
            )}
            <ul>
              {result.events.map((event) => (
                <li key={event.event_id}>
                  {event.event_id} · {event.event_time}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>No NASA data loaded. Environmental exposure is unmeasured.</p>
        )}
      </div>
    </section>
  );
}
