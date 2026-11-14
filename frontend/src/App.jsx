import Body from "./components/Body"
import Simulator from "./components/simulator"
import HazardBar from "./components/HazardBar"
import MetricsPanel from "./components/MetricsPanel"
import Log from "./components/Log"
import { getLevel } from "./status.js"

import { useState } from "react";
import { METRICS, HAZARDS, LOCATIONS } from "./data.js";


import "./App.css";

function App() {
 const [values, setValues] = useState(
    Object.fromEntries(METRICS.map((m) => [m.id, m.default]))
  );
  const [location, setLocation] = useState("station");

  const setValue = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  // metric id -> level
  const levels = Object.fromEntries(METRICS.map((m) => [m.id, getLevel(m, values[m.id])]));

  return (
    <main className="">
      <Simulator />
      <HazardBar hazards={HAZARDS}/>
      <MetricsPanel
        metrics={METRICS}
        values={values}
        hazards={HAZARDS}
        locations={LOCATIONS}
        location={location}
        onChange={setValue}
        onLocation={setLocation}
      />
      <Body />
      <Log />
    </main>
  );
}

export default App;
