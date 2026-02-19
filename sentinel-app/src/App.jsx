import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { buildOnePageBrief } from "./briefTemplate";
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const demoBrief = buildOnePageBrief({
    title: "Decision Brief: Demo",
    whatChanged: ["Inflation ticked up", "Energy costs increased"],
    whyItMatters: "Household pressure can rise quickly and expectations can shift.",
    options: ["Coordinate agency response", "Targeted relief plan", "Wait for more data"],
    risks: ["Public confidence drops", "Costs spread into essentials"],
    watchNext: ["Energy index", "Unemployment rate"],
    unknowns: ["How much is supply-driven", "Timeline of pass-through"],
    confidenceNotes: ["70%: data trend is consistent", "50%: cause is uncertain"],
    sources: ["Placeholder: CPI release", "Placeholder: energy tracker"],
  });

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>

      <pre style={{ textAlign: "left", whiteSpace: "pre-wrap", marginTop: 16 }}>
        {demoBrief}
      </pre>
    </>
  )
}

export default App
