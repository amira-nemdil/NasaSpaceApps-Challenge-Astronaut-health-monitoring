import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BrainCircuit, CheckCircle2, ChevronRight, Clock3,
  CloudDownload, Command, HeartPulse, Info, Moon, Radio, ShieldAlert,
  ShieldCheck, Sparkles, Sun, Users, WifiOff, Zap
} from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const SCENARIOS = [
  { key: 'nominal', label: 'Nominal mission', detail: 'Expected routine variation' },
  { key: 'sleep_debt', label: 'Sleep debt', detail: 'Reduced sleep + rising fatigue' },
  { key: 'cardio_stress', label: 'Heart-rate shift', detail: 'Sustained HR elevation' },
];
const METRICS = [
  { key: 'heart_rate', title: 'Resting heart rate', unit: 'bpm', icon: HeartPulse, color: '#ff817e', decimals: 0 },
  { key: 'sleep_hours', title: 'Sleep duration', unit: 'hrs', icon: Moon, color: '#8c9dff', decimals: 1 },
  { key: 'fatigue', title: 'Reported fatigue', unit: '/ 10', icon: Zap, color: '#ffd278', decimals: 1 },
  { key: 'mood', title: 'Reported mood', unit: '/ 5', icon: BrainCircuit, color: '#79d5c6', decimals: 1 },
];
const STATUS = {
  normal: { title: 'Within baseline', className: 'normal', icon: ShieldCheck, description: 'No major deviations detected by the prototype model.' },
  watch: { title: 'Monitor change', className: 'watch', icon: Info, description: 'A measurement deviates from the simulated personal baseline.' },
  review: { title: 'Review recommended', className: 'review', icon: ShieldAlert, description: 'Multiple or pronounced deviations detected in the demonstration.' },
};

function svgPoints(rows, field, w = 500, h = 144, margin = 12) {
  const values = rows.map(r => r[field]);
  const lo = Math.min(...values); const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.22, field === 'heart_rate' ? 2 : 0.2);
  const min = lo - pad; const max = hi + pad;
  const points = values.map((value, i) => ({
    x: margin + (i / Math.max(1, values.length - 1)) * (w - 2 * margin),
    y: margin + ((max - value) / (max - min)) * (h - 2 * margin),
  }));
  return points;
}

function TrendChart({ rows, field, color, selectedDay, baseline, unit }) {
  const points = useMemo(() => svgPoints(rows, field), [rows, field]);
  const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const fillPath = `${path} L ${points.at(-1).x} 144 L ${points[0].x} 144 Z`;
  const selected = points[selectedDay - 1];
  const baselineSelected = baseline?.mean;
  const uid = `gradient-${field}`;
  return (
    <div className="chart-block">
      <svg className="trend-chart" viewBox="0 0 500 144" preserveAspectRatio="none" role="img" aria-label={`${field} trend over mission days 1 through 14; selected day ${selectedDay}: ${rows[selectedDay - 1]?.[field]} ${unit}`}>
        <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[25, 72, 119].map(y => <line key={y} x1="12" x2="488" y1={y} y2={y} stroke="#263646" strokeDasharray="4 7" />)}
        <path d={fillPath} fill={`url(#${uid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {selected && <><line x1={selected.x} x2={selected.x} y1="7" y2="136" stroke="#9baec0" strokeDasharray="3 5" opacity=".7" /><circle cx={selected.x} cy={selected.y} r="5" fill={color} stroke="#10202d" strokeWidth="3" /></>}
      </svg>
      <div className="chart-footer"><span>DAY 01</span><span>PERSONAL BASELINE · {baselineSelected} {unit}</span><span>DAY 14</span></div>
    </div>
  );
}

function Brand() {
  return <div className="brand"><div className="brand-icon"><Activity size={22} /></div><div><div className="brand-name">ASTRO<span>PULSE</span></div><div className="brand-byline">INFINITYDZ / MISSION HEALTH</div></div></div>;
}

function StatusPill({ status }) {
  const item = STATUS[status] || STATUS.normal;
  const Icon = item.icon;
  return <span className={`status-pill ${item.className}`}><Icon size={14}/>{item.title}</span>;
}

function App() {
  const [crew, setCrew] = useState([]);
  const [crewId, setCrewId] = useState('crew-01');
  const [scenario, setScenario] = useState('sleep_debt');
  const [day, setDay] = useState(14);
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState({});

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/crew?scenario=${scenario}`)
      .then(async res => { if (!res.ok) throw Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (alive) setCrew(data.crew); })
      .catch(() => {});
    return () => { alive = false; };
  }, [scenario]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    fetch(`${API}/api/crew/${crewId}?scenario=${scenario}`)
      .then(async res => { if (!res.ok) throw Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (alive) setMission(data); })
      .catch(e => { if (alive) { setMission(null); setError(`Cannot reach the AstroPulse backend (${e.message}). Start FastAPI on port 8000 and refresh.`); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [crewId, scenario]);

  useEffect(() => { setNotes(savedNotes[`${crewId}:${scenario}:${day}`] || ''); }, [crewId, scenario, day, savedNotes]);

  async function loadWeather() {
    setWeatherBusy(true);
    try {
      const response = await fetch(`${API}/api/space-weather`);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      setWeather(await response.json());
    } catch {
      setWeather({ available: false, events: [], error: 'Live event feed could not be loaded. No events were fabricated.' });
    } finally { setWeatherBusy(false); }
  }

  const current = mission?.timeline?.[day - 1];
  const status = STATUS[current?.status] || STATUS.normal;
  const StatusIcon = status.icon;

  return <div className="shell">
    <aside className="sidebar">
      <Brand />
      <div className="side-section-label">MISSION CONSOLE</div>
      <div className="side-link active"><Activity size={17}/> Mission Health <span className="side-active-dot"/></div>
      <div className="side-link muted"><Radio size={17}/> Telemetry Simulation</div>
      <div className="side-link muted"><Users size={17}/> Crew Overview</div>
      <div className="side-divider"/>
      <div className="side-heading"><span>CREW MEMBERS</span><span className="crew-count">03</span></div>
      <div className="crew-list">
        {(crew.length ? crew : [
          {id:'crew-01', name:'Dr. Maya Reyes', role:'Mission commander', initials:'MR'},
          {id:'crew-02', name:'Alex Morgan', role:'Flight engineer', initials:'AM'},
          {id:'crew-03', name:'Samira Chen', role:'Mission specialist', initials:'SC'}
        ]).map((person, index) => <button className={`crew-button ${crewId === person.id ? 'selected' : ''}`} onClick={() => setCrewId(person.id)} key={person.id} aria-pressed={crewId === person.id}>
          <span className={`avatar a-${index}`}>{person.initials}</span><span className="crew-text"><strong>{person.name}</strong><small>{person.role}</small></span><ChevronRight size={15}/>
        </button>)}
      </div>
      <div className="side-bottom"><div className="offline-card"><WifiOff size={17}/><div><strong>Local-first demo</strong><small>Mission monitoring runs without a live space-data feed</small></div></div><div className="side-credit">SPACE APPS CHALLENGE 2026 <span>×</span> BOUMERDÈS</div></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb"><Command size={15}/><span>Mission Control</span><ChevronRight size={15}/><strong>Health Overview</strong></div><div className="topbar-right"><span className="topbar-label"><span className="pulse-dot"/> SYSTEM ONLINE</span><span className="mission-chip">DEMO MISSION / DAY {String(day).padStart(2, '0')}</span></div></header>
      <div className="content">
        <div className="headline-row"><div><div className="eyebrow"><Sparkles size={15}/> PERSONALIZED CREW HEALTH INTELLIGENCE</div><h1>Mission Health <span>Overview</span></h1><p className="subtitle">Actionable, explainable insights for crew wellness on long-duration missions.</p></div><div className="live-chip"><span className="live-dot"/> SIMULATED TELEMETRY</div></div>
        <div className="notice"><Info size={17}/><p><strong>Research prototype.</strong> All astronaut profiles, readings, and model thresholds are synthetic and not clinically validated. This system does not provide diagnoses or flight-medical instructions.</p></div>
        <div className="toolbar"><div className="toolbar-left"><span className="control-label">MISSION SCENARIO</span><div className="scenario-switch" role="group" aria-label="Mission scenario">{SCENARIOS.map(item => <button type="button" key={item.key} onClick={() => setScenario(item.key)} className={scenario === item.key ? 'active' : ''} aria-pressed={scenario === item.key}>{item.label}</button>)}</div></div><div className="toolbar-note">Try a scenario to see baseline-aware monitoring</div></div>
        {error && <div className="error-notice"><ShieldAlert size={19}/>{error}</div>}
        {loading && <div className="loading">Retrieving local mission telemetry…</div>}
        {mission && current && <>
          <section className="mission-banner"><div className="mission-banner-main"><div className="mission-glyph"><HeartPulse size={25}/></div><div><div className="mini-label">CREW MEMBER STATUS · DAY {String(day).padStart(2, '0')}</div><h2>{mission.crew.name}</h2><p>{mission.crew.role} <span>·</span> Simulated mission, {day} days elapsed</p></div></div><div className="banner-status"><StatusPill status={current.status}/><span>{status.description}</span></div></section>
          <div className="grid-2-1"><div className="left-column"><div className="metric-grid">{METRICS.map(metric => { const Icon = metric.icon; const delta = current[metric.key] - mission.baselines[metric.key].mean; return <article className="metric-card" key={metric.key}><div className="metric-top"><span>{metric.title}</span><span className="metric-icon" style={{color: metric.color}}><Icon size={18}/></span></div><div className="metric-value">{current[metric.key].toFixed(metric.decimals)} <small>{metric.unit}</small></div><div className="metric-compare">Baseline <b>{mission.baselines[metric.key].mean.toFixed(metric.decimals)}</b> <span className={Math.abs(delta) < 0.2 ? 'delta-neutral' : 'delta'}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs baseline</span></div><TrendChart rows={mission.timeline} field={metric.key} color={metric.color} selectedDay={day} baseline={mission.baselines[metric.key]} unit={metric.unit}/></article>; })}</div>
            <section className="panel day-panel"><div className="panel-heading"><div><div className="mini-label">MISSION TIMELINE</div><h3>Explore a day</h3></div><span className="panel-icon"><Clock3 size={17}/></span></div><div className="timeline-top"><strong>DAY {String(day).padStart(2, '0')}</strong><span>{day <= 7 ? 'Baseline reference period' : 'Monitoring period'} · 14 day simulation</span></div><input type="range" min="1" max="14" value={day} onChange={e => setDay(Number(e.target.value))} aria-label="Selected mission day"/><div className="timeline-foot"><span>01</span><span>07 · BASELINE END</span><span>14</span></div><p className="panel-hint">Days 1–7 define a simulated personal reference. Subsequent days are checked for unusual patterns; this is not a clinical model.</p></section>
          </div><div className="right-column"><section className="panel assessment-panel"><div className="panel-heading"><div><div className="mini-label">EXPLAINABLE SIGNAL ANALYSIS</div><h3>Health assessment</h3></div><span className="panel-icon"><BrainCircuit size={18}/></span></div><div className={`assessment-status ${current.status}`}><StatusIcon size={23}/><div><strong>{status.title}</strong><span>Prototype deviation score: {current.score.toFixed(2)}</span></div></div><p className="assessment-desc">{current.advice}</p><div className="divider"/><div className="mini-label">WHAT CONTRIBUTED?</div>{current.drivers.length ? <div className="driver-list">{current.drivers.map(driver => <div className="driver" key={driver.field}><span className="driver-dot"/><div><strong>{driver.label}</strong><p>{driver.message}</p><small>{driver.score.toFixed(1)}× demo baseline variability</small></div></div>)}</div> : <div className="clear-state"><CheckCircle2 size={18}/>No important shifts in this demonstration day.</div>}<div className="explain-box"><Info size={17}/><p>Model compares each value to the mean and variability of days 1–7, with minimum variability floors. Scores and alert cutoffs are for demonstration only.</p></div></section>
          <section className="panel action-panel"><div className="panel-heading"><div><div className="mini-label">CREW SELF-CHECK</div><h3>Daily health note</h3></div><span className="panel-icon"><Activity size={17}/></span></div><label htmlFor="crew-note">Optional non-medical mission observation</label><textarea id="crew-note" rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Poor sleep following a busy shift…"/><button className="primary-button" onClick={() => setSavedNotes(old => ({...old,[`${crewId}:${scenario}:${day}`]:notes}))}>Save note in session <ArrowRight size={17}/></button><small>Notes are kept in page memory until you reload; they are not uploaded or permanently saved.</small></section></div></div>
        </>}
        <section className="panel weather-panel"><div className="weather-heading"><div className="weather-title"><div className="weather-icon"><Sun size={23}/></div><div><div className="mini-label">OPTIONAL REAL-WORLD NASA DATA</div><h3>Space weather events</h3><p>NASA DONKI solar energetic particle reports — contextual events, <strong>not astronaut exposure measurements.</strong></p></div></div><button className="outline-button" onClick={loadWeather} disabled={weatherBusy}><CloudDownload size={16}/>{weatherBusy ? 'Loading…' : 'Load NASA events'}</button></div>{weather && (weather.available ? <div className="weather-results"><div className="weather-source"><CheckCircle2 size={15}/> Live NASA DONKI reports loaded. {weather.events.length ? `${weather.events.length} latest events shown.` : 'No SEP events found in the selected reporting window.'}</div>{weather.events.length > 0 && <div className="event-list">{weather.events.map((event,i) => <div className="event-row" key={`${event.event_id}-${i}`}><span className="event-dot"/><span>{event.event_id}</span><time>{event.event_time || 'Date unavailable'}</time></div>)}</div>}<p className="weather-disclaimer">{weather.important}</p></div> : <div className="weather-error"><Info size={17}/>{weather.error}</div>)}</section>
        <footer className="footer"><span>ASTROPULSE BY INFINITYDZ · 2026 NASA SPACE APPS CHALLENGE</span><span>Built for demonstration, not for medical or operational use.</span></footer>
      </div>
    </main>
  </div>;
}

export default App;
