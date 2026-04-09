import React, { useMemo, useState } from "react";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function nowString() {
  return new Date().toLocaleString();
}

function randomStep(value, step, min, max, decimals = 2) {
  const delta = Math.random() * step * 2 - step;
  const next = value + delta;
  const fixed = Number(next.toFixed(decimals));
  return clamp(fixed, min, max);
}

function uniqueList(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = String(x || "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function prettySignals(s) {
  return [
    `inflation: ${s.inflation}%`,
    `unemployment: ${s.unemployment}%`,
    `energy_index: ${s.energy_index}`,
    `cyber_severity: ${s.cyber_severity} / 5`,
    `intl_tension: ${s.intl_tension} / 5`,
    `misinfo_index: ${s.misinfo_index} / 100`,
  ].join("\n");
}

function confidenceFromSignals(scenario, s) {
  if (scenario === "inflation") {
    const score =
      0.55 +
      clamp((s.inflation - 2.0) / 3.0, 0, 1) * 0.25 +
      clamp((s.energy_index - 100) / 30, 0, 1) * 0.1;
    return clamp(Number(score.toFixed(2)), 0.35, 0.92);
  }
  if (scenario === "cyber") {
    const score = 0.5 + clamp((s.cyber_severity - 1) / 4, 0, 1) * 0.35;
    return clamp(Number(score.toFixed(2)), 0.35, 0.92);
  }
  if (scenario === "intl") {
    const score = 0.5 + clamp((s.intl_tension - 1) / 4, 0, 1) * 0.35;
    return clamp(Number(score.toFixed(2)), 0.35, 0.92);
  }
  return 0.6;
}

function titleForScenario(s) {
  if (s === "inflation") return "Decision Brief: Inflation spike";
  if (s === "cyber") return "Decision Brief: Major cyber incident";
  if (s === "intl") return "Decision Brief: International crisis";
  return "Decision Brief";
}

function summarizeWhy(scenario) {
  if (scenario === "inflation") {
    return "Rising prices can spread into household stress and market expectations, increasing the cost of action later.";
  }
  if (scenario === "cyber") {
    return "A fast-moving incident can disrupt services and trust; early coordination reduces confusion and limits damage.";
  }
  if (scenario === "intl") {
    return "Escalation risk rises with uncertainty; aligned messaging and reliable channels lower the chance of miscalculation.";
  }
  return "The situation may affect multiple national interest areas and requires a coordinated response.";
}

function watchNextLines(s, scenario) {
  if (scenario === "inflation") {
    return [
      `Inflation and energy movement (inflation ${s.inflation}%, energy_index ${s.energy_index})`,
      `Labor softness (unemployment ${s.unemployment}%)`,
      "Public sentiment and supply chain signals",
    ];
  }
  if (scenario === "cyber") {
    return [
      `Severity changes (cyber_severity ${s.cyber_severity} / 5)`,
      "Indicators of persistence and lateral movement",
      `Misinformation movement (misinfo_index ${s.misinfo_index} / 100)`,
    ];
  }
  if (scenario === "intl") {
    return [
      `Tension changes (intl_tension ${s.intl_tension} / 5)`,
      "Allied alignment and message discipline",
      `Misinformation movement (misinfo_index ${s.misinfo_index} / 100)`,
    ];
  }
  return ["Key indicators and confirmed facts"];
}

function evaluateTriggers(prev, next, watchKeys) {
  const alerts = [];
  const rules = {
    inflation: (p, n) => n - p >= 0.4,
    unemployment: (p, n) => n - p >= 0.3,
    energy_index: (p, n) => n - p >= 6,
    cyber_severity: (p, n) => n - p >= 1,
    intl_tension: (p, n) => n - p >= 1,
    misinfo_index: (p, n) => n - p >= 12,
  };

  for (const k of watchKeys) {
    const fn = rules[k];
    if (!fn) continue;
    if (fn(prev[k], next[k])) {
      alerts.push(`Trigger: ${k} moved fast (${prev[k]} to ${next[k]})`);
    }
  }
  return alerts;
}

function agentEconomy(signals, scenario) {
  const claims = [];
  const redFlags = [];
  const unknowns = [];
  const sources = [];

  if (scenario === "inflation") {
    claims.push({
      text: `Inflation is at ${signals.inflation}% and may accelerate if energy costs remain elevated.`,
      conf: confidenceFromSignals(scenario, signals),
      why: "Inflation trend and energy movement.",
    });
    redFlags.push("Persistent inflation can raise borrowing costs and weaken public confidence.");
    unknowns.push("Supply-driven versus demand-driven contribution is uncertain.");
    sources.push("Placeholder: CPI releases, energy pricing feeds");
  } else {
    claims.push({
      text: "Economic conditions are stable but sensitive to shocks and expectations.",
      conf: 0.62,
      why: "No direct inflation shock scenario selected.",
    });
    unknowns.push("Second-order effects on consumer confidence and investment.");
    sources.push("Placeholder: macro dashboard indicators");
  }

  const options = [
    "Option A: Public reassurance with targeted actions to stabilize prices and expectations.",
    "Option B: Convene agency heads to align near-term measures and messaging.",
    "Option C: Prepare a contingency package if indicators worsen.",
  ];

  return { name: "Economy Agent", claims, options, redFlags, unknowns, sources };
}

function agentSecurity(signals, scenario) {
  const claims = [];
  const redFlags = [];
  const unknowns = [];
  const sources = [];

  if (scenario === "cyber") {
    claims.push({
      text: `Cyber severity is ${signals.cyber_severity} out of 5 and could threaten critical services if escalation continues.`,
      conf: confidenceFromSignals(scenario, signals),
      why: "Severity score and incident pattern.",
    });
    redFlags.push("Critical infrastructure disruption could spread across sectors.");
    unknowns.push("Initial access vector and scope of compromise are not confirmed.");
    sources.push("Placeholder: CISA advisories, incident reports");
  } else if (scenario === "intl") {
    claims.push({
      text: `Security posture should account for elevated international tension at ${signals.intl_tension} out of 5.`,
      conf: confidenceFromSignals(scenario, signals),
      why: "Tension indicator elevated.",
    });
    redFlags.push("Misread signals could increase escalation risk.");
    unknowns.push("Adversary intent and likely red lines are unclear.");
    sources.push("Placeholder: intelligence summaries");
  } else {
    claims.push({
      text: "No acute security incident detected, but baseline readiness checks remain important.",
      conf: 0.6,
      why: "No incident scenario selected.",
    });
    sources.push("Placeholder: security posture dashboard");
  }

  const options = [
    "Option A: Activate an interagency coordination cell with clear owners and hourly updates.",
    "Option B: Quietly raise readiness and request targeted briefings from technical teams.",
    "Option C: Public statement only after facts are confirmed to reduce misinformation.",
  ];

  return { name: "National Security Agent", claims, options, redFlags, unknowns, sources };
}

function agentDiplomacy(signals, scenario) {
  const claims = [];
  const redFlags = [];
  const unknowns = [];
  const sources = [];

  if (scenario === "intl") {
    claims.push({
      text: `International tension is ${signals.intl_tension} out of 5 and may require allied coordination within 24 hours.`,
      conf: confidenceFromSignals(scenario, signals),
      why: "Tension indicator and allied risk.",
    });
    redFlags.push("Conflicting allied messages can reduce leverage and increase uncertainty.");
    unknowns.push("Which counterpart channels are still reliable.");
    sources.push("Placeholder: allied comms, State reporting");
  } else {
    claims.push({
      text: "Diplomatic environment is steady; maintain engagement and monitor for rapid shifts.",
      conf: 0.58,
      why: "No crisis scenario selected.",
    });
    sources.push("Placeholder: diplomatic watch notes");
  }

  const options = [
    "Option A: Immediate calls with key allies to align stance and private demands.",
    "Option B: Backchannel contact to reduce uncertainty and clarify red lines.",
    "Option C: Formal statement after confirming on-the-ground facts.",
  ];

  return { name: "International Relations Agent", claims, options, redFlags, unknowns, sources };
}

function agentJobsAndLiving(signals, scenario) {
  const claims = [];
  const redFlags = [];
  const unknowns = [];
  const sources = [];

  if (scenario === "inflation") {
    claims.push({
      text: `Household cost pressure could rise quickly if the energy index stays elevated at ${signals.energy_index}.`,
      conf: confidenceFromSignals(scenario, signals),
      why: "Energy index and inflation trend.",
    });
    redFlags.push("Household pressure can rise faster than wages adjust.");
    unknowns.push("Regional variation and which goods drive perception most.");
    sources.push("Placeholder: consumer sentiment, retail pricing trackers");
  } else {
    claims.push({
      text: "Jobs and cost of living remain manageable; communications should stay grounded in measurable indicators.",
      conf: 0.6,
      why: "No cost shock scenario selected.",
    });
    sources.push("Placeholder: labor stats, price trackers");
  }

  const options = [
    "Option A: Targeted relief focus for the most affected households.",
    "Option B: Emphasize market stability measures and enforcement where appropriate.",
    "Option C: Pair messaging with a clear timeline for follow-up metrics.",
  ];

  return { name: "Jobs and Cost of Living Agent", claims, options, redFlags, unknowns, sources };
}

function buildBrief({ signals, scenario, timePressure, onePageMode, humanNotes }) {
  const agents = [
    agentEconomy(signals, scenario),
    agentSecurity(signals, scenario),
    agentDiplomacy(signals, scenario),
    agentJobsAndLiving(signals, scenario),
  ];

  const whatChanged = agents.flatMap((a) => a.claims.map((c) => c.text));
  const whyMatters = summarizeWhy(scenario);
  const poolOptions = uniqueList(agents.flatMap((a) => a.options));
  const options = timePressure === "high" ? poolOptions.slice(0, 2) : poolOptions.slice(0, 3);

  const redFlags = uniqueList(agents.flatMap((a) => a.redFlags)).slice(0, 5);
  const unknowns = uniqueList(agents.flatMap((a) => a.unknowns)).slice(0, 5);
  const watchNext = watchNextLines(signals, scenario);

  const lines = [];
  lines.push("What changed");
  lines.push(`- ${whatChanged[0] || "No change detected."}`);
  const extra = onePageMode ? 2 : 6;
  for (const t of whatChanged.slice(1, extra)) lines.push(`- ${t}`);

  lines.push("");
  lines.push("Why it matters");
  lines.push(`- ${whyMatters}`);

  lines.push("");
  lines.push("Options (2 to 3)");
  for (const o of options) lines.push(`- ${o}`);

  lines.push("");
  lines.push("Main risks");
  const risks = redFlags.length ? redFlags : ["No major risks flagged by agents."];
  for (const r of risks) lines.push(`- ${r}`);

  lines.push("");
  lines.push("What to watch next");
  for (const w of watchNext) lines.push(`- ${w}`);

  if (!onePageMode) {
    lines.push("");
    lines.push("Human notes");
    lines.push(`- ${humanNotes || "None"}`);
  }

  const confidenceItems = agents.flatMap((a) =>
    a.claims.map((c) => ({
      agent: a.name,
      claim: c.text,
      conf: c.conf,
      why: c.why,
    }))
  );

  const sources = uniqueList(agents.flatMap((a) => a.sources));

  return {
    title: titleForScenario(scenario),
    generatedAt: nowString(),
    briefText: lines.join("\n"),
    confidenceItems,
    redFlags,
    unknowns,
    sources,
    agentsUsed: agents.map((a) => a.name),
  };
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BriefingDemo() {
  const [scenario, setScenario] = useState("inflation");
  const [timePressure, setTimePressure] = useState("medium");
  const [onePageMode, setOnePageMode] = useState(true);
  const [humanNotes, setHumanNotes] = useState("");

  const [watchlist, setWatchlist] = useState({
    inflation: true,
    unemployment: false,
    energy_index: true,
    cyber_severity: false,
    intl_tension: false,
    misinfo_index: false,
  });

  const [signals, setSignals] = useState({
    inflation: 3.2,
    unemployment: 4.1,
    energy_index: 100,
    cyber_severity: 2,
    intl_tension: 2,
    misinfo_index: 40,
  });

  const [alerts, setAlerts] = useState([]);
  const [brief, setBrief] = useState(null);

  const watchKeys = useMemo(
    () => Object.keys(watchlist).filter((k) => watchlist[k]),
    [watchlist]
  );

  const simulateSignalChange = () => {
    const prev = { ...signals };
    const next = {
      inflation: randomStep(signals.inflation, 0.35, 0.8, 9.5, 2),
      unemployment: randomStep(signals.unemployment, 0.25, 2.8, 9.9, 2),
      energy_index: Math.round(randomStep(signals.energy_index, 7, 60, 160, 0)),
      cyber_severity: Math.round(randomStep(signals.cyber_severity, 1, 0, 5, 0)),
      intl_tension: Math.round(randomStep(signals.intl_tension, 1, 0, 5, 0)),
      misinfo_index: Math.round(randomStep(signals.misinfo_index, 14, 0, 100, 0)),
    };

    const newAlerts = evaluateTriggers(prev, next, watchKeys);
    setSignals(next);
    setAlerts(newAlerts);
  };

  const generateBrief = () => {
    const built = buildBrief({ signals, scenario, timePressure, onePageMode, humanNotes });
    setBrief(built);
  };

  const exportBrief = () => {
    if (!brief) return;

    const lines = [];
    lines.push(brief.title);
    lines.push(`Generated: ${brief.generatedAt}`);
    lines.push("");
    lines.push(brief.briefText);
    lines.push("");
    lines.push("Confidence Dial");
    lines.push(
      brief.confidenceItems
        .map((ci) => {
          const pct = Math.round(ci.conf * 100);
          return `- ${pct}% | ${ci.agent} | ${ci.why}\n  ${ci.claim}`;
        })
        .join("\n\n")
    );
    lines.push("");
    lines.push("Red Flag List");
    lines.push((brief.redFlags || []).map((r) => `- ${r}`).join("\n") || "- (none)");
    lines.push("");
    lines.push("Unknowns Box");
    lines.push((brief.unknowns || []).map((u) => `- ${u}`).join("\n") || "- (none)");
    lines.push("");
    lines.push("Sources");
    lines.push((brief.sources || []).map((s) => `- ${s}`).join("\n") || "- (none)");
    lines.push("");
    lines.push("Human in the loop note");
    lines.push("Final decision remains with the human decision maker.");

    downloadTextFile(lines.join("\n"), "decision_brief.txt");
  };

  const card = { border: "1px solid #ccc", borderRadius: 12, padding: 14 };
  const box = { border: "1px solid #e0e0e0", borderRadius: 12, padding: 10 };
  const select = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #aaa", boxSizing: "border-box" };
  const textArea = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #aaa", boxSizing: "border-box", minHeight: 90 };
  const btn = { padding: "10px 12px", borderRadius: 10, border: "1px solid #333", background: "#fff", cursor: "pointer" };
  const pill = (ok) => ({ display: "inline-block", padding: "4px 10px", borderRadius: 999, border: `1px solid ${ok ? "#2a7" : "#c33"}`, fontSize: 12 });

  return (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 6px 0" }}>Briefing Demo</h2>
      <div style={{ color: "#555", marginBottom: 12 }}>
        Multi agent briefing generator you can demo live for your senior project.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <label style={{ fontWeight: 700 }}>Scenario</label>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={select}>
            <option value="inflation">Inflation spike</option>
            <option value="cyber">Major cyber incident</option>
            <option value="intl">International crisis</option>
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <div>
              <label style={{ fontWeight: 700 }}>Time pressure</label>
              <select value={timePressure} onChange={(e) => setTimePressure(e.target.value)} style={select}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700 }}>One page mode</label>
              <select value={onePageMode ? "on" : "off"} onChange={(e) => setOnePageMode(e.target.value === "on")} style={select}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>

          <div style={{ height: 1, background: "#e8e8e8", margin: "12px 0" }} />

          <label style={{ fontWeight: 700 }}>Watchlist triggers</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["inflation", "Inflation acceleration"],
              ["unemployment", "Job losses"],
              ["energy_index", "Energy price spike"],
              ["cyber_severity", "Critical system breach"],
              ["intl_tension", "Allied escalation"],
              ["misinfo_index", "Misinformation surge"],
            ].map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={!!watchlist[key]} onChange={(e) => setWatchlist((w) => ({ ...w, [key]: e.target.checked }))} />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ height: 1, background: "#e8e8e8", margin: "12px 0" }} />

          <label style={{ fontWeight: 700 }}>Human notes (optional)</label>
          <textarea value={humanNotes} onChange={(e) => setHumanNotes(e.target.value)} style={textArea} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            <button style={btn} onClick={simulateSignalChange}>Simulate signal change</button>
            <button style={btn} onClick={generateBrief}>Generate brief</button>
            <button style={btn} onClick={exportBrief} disabled={!brief}>Export TXT</button>
            <span style={pill(alerts.length === 0)}>{alerts.length ? `${alerts.length} alert(s)` : "No alerts"}</span>
          </div>

          <div style={{ marginTop: 12, ...box }}>
            <b>Current signals</b>
            <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>{prettySignals(signals)}</pre>
          </div>

          {alerts.length > 0 && (
            <div style={{ marginTop: 12, ...box }}>
              <b>Triggered alerts</b>
              <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
                {alerts.map((a) => `- ${a}`).join("\n")}
              </pre>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ ...box }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <b>{brief ? brief.title : "Brief not generated"}</b>
              <span style={{ fontSize: 12, color: "#555" }}>{brief ? `Generated ${brief.generatedAt}` : "Ready"}</span>
            </div>
            <div style={{ height: 1, background: "#e8e8e8", margin: "12px 0" }} />
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{brief ? brief.briefText : "(click Generate brief)"}</pre>
          </div>

          <div style={{ height: 1, background: "#e8e8e8", margin: "12px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={box}>
              <b>Confidence Dial</b>
              <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
                {brief
                  ? brief.confidenceItems
                      .map((ci) => {
                        const pct = Math.round(ci.conf * 100);
                        return `- ${pct}% | ${ci.agent} | ${ci.why}\n  ${ci.claim}`;
                      })
                      .join("\n\n")
                  : "(empty)"}
              </pre>
            </div>
            <div style={box}>
              <b>Sources</b>
              <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
                {brief ? (brief.sources || []).map((s) => `- ${s}`).join("\n") : "(empty)"}
              </pre>
            </div>
            <div style={box}>
              <b>Red Flag List</b>
              <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
                {brief ? (brief.redFlags || []).map((r) => `- ${r}`).join("\n") : "(empty)"}
              </pre>
            </div>
            <div style={box}>
              <b>Unknowns Box</b>
              <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
                {brief ? (brief.unknowns || []).map((u) => `- ${u}`).join("\n") : "(empty)"}
              </pre>
            </div>
          </div>

          {brief && <div style={{ marginTop: 12, color: "#555", fontSize: 13 }}>Human in the loop: final decision remains with the human decision maker.</div>}
        </div>
      </div>
    </div>
  );
}
