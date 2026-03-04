// File: econ_cli_noopenai.mjs
// Multi agent economy decision support with:
// 1) FRED evidence (latest + previous + delta)
// 2) Scenario overrides to prove behavior changes
// 3) Conditional action selection based on thresholds
// 4) Clean terminal report + optional JSON output

import chalk from "chalk";
import fs from "fs";

const FRED_KEY = process.env.FRED_API_KEY || "";

// -----------------------------
// FRED fetch helpers
// -----------------------------
async function fetchFredLatestN(seriesId, limit = 2) {
  if (!FRED_KEY) return { ok: false, error: "FRED_API_KEY not set" };

  const url =
    "https://api.stlouisfed.org/fred/series/observations" +
    `?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${encodeURIComponent(FRED_KEY)}` +
    `&file_type=json&sort_order=desc&limit=${limit}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `FRED HTTP ${res.status}` };

    const json = await res.json();
    const obs = Array.isArray(json?.observations) ? json.observations : [];

    if (obs.length === 0) return { ok: false, error: "No observations" };

    const parseObs = (o) => {
      const date = o?.date;
      const valueRaw = o?.value;
      if (!date || valueRaw == null || valueRaw === ".") return null;
      const value = Number(valueRaw);
      if (!Number.isFinite(value)) return null;
      return { date, value };
    };

    const latest = parseObs(obs[0]);
    const previous = obs.length > 1 ? parseObs(obs[1]) : null;

    if (!latest) return { ok: false, error: "Latest observation invalid" };

    const delta = previous ? latest.value - previous.value : null;
    const pct = previous && previous.value !== 0 ? (delta / previous.value) * 100 : null;

    return {
      ok: true,
      seriesId,
      value: latest.value,
      date: latest.date,
      latest,
      previous,
      delta,
      pct,
      sourceUrl: "https://fred.stlouisfed.org/series/" + seriesId,
    };
  } catch {
    return { ok: false, error: "fetch failed" };
  }
}

async function getEvidence() {
  const SERIES = {
    CPI: "CPIAUCSL",
    CORE_CPI: "CPILFESL",
    UNEMPLOYMENT: "UNRATE",
    PAYROLLS: "PAYEMS",
    GAS: "GASREGW",
    RENT: "CUSR0000SEHA",
  };

  const out = {};
  for (const [k, id] of Object.entries(SERIES)) out[k] = await fetchFredLatestN(id, 2);
  return out;
}

// -----------------------------
// Scenario overrides (proves it is not the same report)
// -----------------------------
function applyScenarioOverrides(evidence, scenario) {
  const copy = JSON.parse(JSON.stringify(evidence));

  const recalc = (k) => {
    const ev = copy[k];
    if (!ev || ev.ok !== true || !ev.latest) return;

    ev.value = ev.latest.value;

    if (ev.previous && Number.isFinite(ev.previous.value)) {
      ev.delta = ev.latest.value - ev.previous.value;
      ev.pct = ev.previous.value !== 0 ? (ev.delta / ev.previous.value) * 100 : null;
    } else {
      ev.delta = null;
      ev.pct = null;
    }
  };

  if (scenario === "high_gas" && copy.GAS?.ok === true) {
    copy.GAS.latest.value = 4.25;
    recalc("GAS");
  }

  if (scenario === "high_unemployment" && copy.UNEMPLOYMENT?.ok === true) {
    copy.UNEMPLOYMENT.latest.value = 6.1;
    recalc("UNEMPLOYMENT");
  }

  if (scenario === "high_rent" && copy.RENT?.ok === true) {
    copy.RENT.latest.value = copy.RENT.latest.value + 30;
    recalc("RENT");
  }

  if (scenario === "cooling_inflation" && copy.CPI?.ok === true && copy.CPI.previous) {
    copy.CPI.latest.value = copy.CPI.previous.value - 0.5;
    recalc("CPI");
  }

  return copy;
}

// -----------------------------
// Shared utils
// -----------------------------
function numLatestOrNull(ev) {
  return ev?.ok === true && ev?.latest && Number.isFinite(ev.latest.value) ? ev.latest.value : null;
}

function pickByCondition({ condition, ifTrue, ifFalse }) {
  return condition ? ifTrue : ifFalse;
}

function fmtDelta(ev) {
  if (!ev || ev.ok !== true) return "";
  if (ev.delta == null || ev.previous == null) return " (no prior point)";
  const d = ev.delta;
  const pct = ev.pct;
  const sign = d > 0 ? "+" : "";
  const pctStr = pct == null ? "" : `, ${sign}${pct.toFixed(2)}%`;
  return ` (change: ${sign}${d.toFixed(3)}${pctStr} vs ${ev.previous.date})`;
}

// -----------------------------
// Agents
// -----------------------------
function pricesAgent(evidence) {
  const cpiOk = evidence.CPI?.ok === true;
  const coreOk = evidence.CORE_CPI?.ok === true;
  const rentOk = evidence.RENT?.ok === true;

  const unrate = numLatestOrNull(evidence.UNEMPLOYMENT);
  const gas = numLatestOrNull(evidence.GAS);

  const findings = [];
  const actions = [];
  const risks = [];
  const claims = [];

  if (cpiOk) {
    findings.push(`CPI latest value is ${evidence.CPI.latest.value} on ${evidence.CPI.latest.date}${fmtDelta(evidence.CPI)}`);
    claims.push({ claim: "Latest CPI pulled from FRED", support: "evidence", evidence_keys: ["CPI"] });
  } else {
    findings.push("CPI unavailable from FRED right now");
    claims.push({ claim: "CPI unavailable", support: "general", evidence_keys: [] });
  }

  if (coreOk) {
    findings.push(`Core CPI latest value is ${evidence.CORE_CPI.latest.value} on ${evidence.CORE_CPI.latest.date}${fmtDelta(evidence.CORE_CPI)}`);
    claims.push({ claim: "Latest Core CPI pulled from FRED", support: "evidence", evidence_keys: ["CORE_CPI"] });
  } else {
    findings.push("Core CPI unavailable from FRED right now");
    claims.push({ claim: "Core CPI unavailable", support: "general", evidence_keys: [] });
  }

  if (rentOk) {
    findings.push(`Rent index latest value is ${evidence.RENT.latest.value} on ${evidence.RENT.latest.date}${fmtDelta(evidence.RENT)}`);
    claims.push({ claim: "Latest rent index pulled from FRED", support: "evidence", evidence_keys: ["RENT"] });
  } else {
    findings.push("Rent index unavailable from FRED right now");
    claims.push({ claim: "Rent index unavailable", support: "general", evidence_keys: [] });
  }

  actions.push(
    pickByCondition({
      condition: rentOk,
      ifTrue: "Launch a time limited rent relief pilot targeted to cost burdened households, paired with eviction prevention and fraud checks",
      ifFalse: "Use emergency rental assistance and eviction prevention where local data shows rising displacement risk",
    })
  );

  actions.push(
    pickByCondition({
      condition: gas != null && gas > 3.5,
      ifTrue: "Prioritize immediate fuel burden relief for low income commuters and expand transit support in the highest cost regions",
      ifFalse: "Focus affordability efforts on food and housing since fuel pressure is not at a high threshold in the latest weekly data",
    })
  );

  actions.push(
    pickByCondition({
      condition: unrate != null && unrate >= 5,
      ifTrue: "Avoid broad demand boosts, focus on targeted relief and rapid reemployment to limit inflation pressure while supporting incomes",
      ifFalse: "Use targeted affordability relief and supply side measures while monitoring labor market tightness",
    })
  );

  actions.push("Increase near term housing supply throughput by pushing permitting support and technical assistance to cities approving multi family starts");

  risks.push("Blunt subsidies can raise prices if supply is fixed, focus on targeted and time limited design");
  risks.push("Housing actions take time, set expectations and pair with near term stabilization steps");

  return {
    agent: "Prices and Cost of Living Agent",
    classification: "prices",
    key_findings: findings,
    risks,
    actions_60_90_days: actions,
    requires_more_data: !(cpiOk || coreOk || rentOk),
    claims,
  };
}

function jobsAgent(evidence) {
  const unOk = evidence.UNEMPLOYMENT?.ok === true;
  const payOk = evidence.PAYROLLS?.ok === true;

  const unemployment = numLatestOrNull(evidence.UNEMPLOYMENT);

  const findings = [];
  const actions = [];
  const risks = [];
  const claims = [];

  if (unOk) {
    findings.push(`Unemployment rate latest value is ${evidence.UNEMPLOYMENT.latest.value} on ${evidence.UNEMPLOYMENT.latest.date}${fmtDelta(evidence.UNEMPLOYMENT)}`);
    claims.push({ claim: "Latest unemployment pulled from FRED", support: "evidence", evidence_keys: ["UNEMPLOYMENT"] });
  } else {
    findings.push("Unemployment data unavailable from FRED right now");
    claims.push({ claim: "Unemployment unavailable", support: "general", evidence_keys: [] });
  }

  if (payOk) {
    findings.push(`Payroll employment latest value is ${evidence.PAYROLLS.latest.value} on ${evidence.PAYROLLS.latest.date}${fmtDelta(evidence.PAYROLLS)}`);
    claims.push({ claim: "Latest payrolls pulled from FRED", support: "evidence", evidence_keys: ["PAYROLLS"] });
  } else {
    findings.push("Payroll data unavailable from FRED right now");
    claims.push({ claim: "Payroll data unavailable", support: "general", evidence_keys: [] });
  }

  actions.push(
    pickByCondition({
      condition: unemployment != null && unemployment >= 5,
      ifTrue: "Trigger rapid response teams in high layoff regions and expand short credential training tied to local openings",
      ifFalse: "Strengthen pipeline programs and targeted hiring incentives in shortage occupations without overheating demand",
    })
  );

  actions.push("Accelerate hiring in critical public service roles using time boxed fast track hiring and retention bonuses where shortages are documented");
  actions.push("Use procurement and small business lending levers to protect jobs in regions showing weakening labor indicators");
  actions.push("Coordinate with the central bank on messaging, avoid policy whiplash that damages hiring confidence");

  risks.push("Overheating demand can worsen inflation, pair job support with supply side actions");
  risks.push("Poorly targeted programs waste money, require metrics and regional triggers");

  return {
    agent: "Jobs and Labor Agent",
    classification: "jobs",
    key_findings: findings,
    risks,
    actions_60_90_days: actions,
    requires_more_data: !(unOk || payOk),
    claims,
  };
}

function energyAgent(evidence) {
  const gasOk = evidence.GAS?.ok === true;
  const gas = numLatestOrNull(evidence.GAS);

  const findings = [];
  const actions = [];
  const risks = [];
  const claims = [];

  if (gasOk) {
    findings.push(`Regular gas price latest value is ${evidence.GAS.latest.value} on ${evidence.GAS.latest.date}${fmtDelta(evidence.GAS)}`);
    claims.push({ claim: "Latest regular gas price pulled from FRED", support: "evidence", evidence_keys: ["GAS"] });
  } else {
    findings.push("Gas price series unavailable from FRED right now");
    claims.push({ claim: "Gas price series unavailable", support: "general", evidence_keys: [] });
  }

  risks.push("Energy shocks can feed headline inflation quickly");

  actions.push(
    pickByCondition({
      condition: gas != null && gas > 3.5,
      ifTrue: "Coordinate short term stabilization steps with energy agencies and states focused on verified supply disruptions",
      ifFalse: "Focus on monitoring and enforcement, avoid heavy handed interventions when fuel pressure is not extreme",
    })
  );

  actions.push("Increase price transparency and enforcement focus in regions showing abnormal spreads between wholesale and retail prices");
  actions.push("Expand targeted energy assistance for households facing utility and fuel burden");

  return {
    agent: "Energy and Oil Agent",
    classification: "energy",
    key_findings: findings,
    risks,
    actions_60_90_days: actions,
    requires_more_data: !gasOk,
    claims,
  };
}

function transportationAgent() {
  return {
    agent: "Transportation and Infrastructure Agent",
    classification: "transportation",
    key_findings: ["No live transport cost series pulled in this build"],
    risks: ["Port or trucking disruptions can raise prices and delay supply"],
    actions_60_90_days: [
      "Clear logistics bottlenecks by expanding port hours and simplifying inspections where safe",
      "Support trucker capacity with temporary operational fixes and targeted maintenance funding",
      "Prioritize repairs on choke points that reduce delivery times for food and essentials",
    ],
    requires_more_data: true,
    claims: [{ claim: "No transport evidence included in this run", support: "general", evidence_keys: [] }],
  };
}

// -----------------------------
// Verifier
// -----------------------------
function verifier(subOutputs, evidence) {
  const keys = new Set(Object.keys(evidence));
  const problems = [];

  for (const out of subOutputs) {
    for (const c of out.claims || []) {
      if (c.support === "evidence") {
        for (const k of c.evidence_keys || []) {
          if (!keys.has(k)) problems.push(`${out.agent} references unknown evidence key ${k}`);
          if (!evidence[k] || evidence[k].ok !== true) problems.push(`${out.agent} marked evidence but ${k} not ok`);
        }
      }
    }
  }

  return problems;
}

// -----------------------------
// Final aggregation
// -----------------------------
function economyAgentFinal(question, evidence, subOutputs, verifierProblems) {
  const evidenceUsed = {};
  for (const [k, v] of Object.entries(evidence)) {
    if (v && v.ok === true) {
      evidenceUsed[k] = {
        date: v.latest?.date || v.date,
        value: v.latest?.value ?? v.value,
        previous_date: v.previous?.date || null,
        previous_value: v.previous?.value ?? null,
        delta: v.delta ?? null,
        pct: v.pct ?? null,
        sourceUrl: v.sourceUrl,
      };
    }
  }

  const whatWeKnow = [];
  for (const [k, v] of Object.entries(evidenceUsed)) {
    const deltaPart =
      v.delta == null || v.previous_date == null
        ? ""
        : `, change ${v.delta >= 0 ? "+" : ""}${Number(v.delta).toFixed(3)} vs ${v.previous_date}`;
    whatWeKnow.push(`${k}: ${v.value} as of ${v.date}${deltaPart}`);
  }
  if (whatWeKnow.length === 0) whatWeKnow.push("Live macro evidence not available in this run");

  const recs = [];
  const risks = [];

  for (const s of subOutputs) {
    for (const a of s.actions_60_90_days || []) recs.push(a);
    for (const r of s.risks || []) risks.push(r);
  }

  if (verifierProblems.length) risks.push("Verifier flagged issues: " + verifierProblems.join(" | "));

  const unique = (arr) => [...new Set(arr)];

  return {
    topic: "economy",
    question,
    what_we_know_from_data: whatWeKnow,
    recommendations_60_90_days: unique(recs).slice(0, 8),
    tradeoffs_and_risks: unique(risks).slice(0, 8),
    what_to_measure_next: [
      "Monthly CPI and core CPI trend",
      "Weekly gasoline price benchmarks if available",
      "Unemployment rate and labor force participation",
      "Payroll growth and hours worked",
      "Rent inflation indicators from private and public sources",
    ],
    evidence_used: evidenceUsed,
  };
}

// -----------------------------
// Pretty terminal report
// -----------------------------
function fmtEvidenceLine(key, ev) {
  if (!ev || ev.ok !== true) return `${key}: unavailable`;
  const latest = ev.latest ? `${ev.latest.value} (as of ${ev.latest.date})` : `${ev.value} (as of ${ev.date})`;
  const delta = fmtDelta(ev);
  return `${key}: ${latest}${delta}`;
}

function printReport({ scenario, question, evidence, subOutputs, verifierProblems, finalOut }) {
  console.clear();

  console.log(chalk.bold("\nECONOMY DECISION SUPPORT REPORT"));

  if (scenario) console.log(chalk.gray("Scenario:"), scenario);
  console.log(chalk.gray("Question:"), question);

  console.log(chalk.bold("\nEvidence (FRED latest):"));
  for (const [k, v] of Object.entries(evidence)) {
    const ok = v?.ok === true;
    const tag = ok ? chalk.green("OK") : chalk.red("NO");
    console.log(`  ${tag}  ${fmtEvidenceLine(k, v)}`);
  }

  console.log(chalk.bold("\nSub Agents:"));
  for (const a of subOutputs) {
    console.log(chalk.cyan(`\n  ${a.agent} (${a.classification})`));

    if (a.key_findings?.length) {
      console.log(chalk.bold("  Findings:"));
      for (const f of a.key_findings) console.log(`   - ${f}`);
    }

    if (a.actions_60_90_days?.length) {
      console.log(chalk.bold("  Actions (60 to 90 days):"));
      for (const act of a.actions_60_90_days) console.log(`   - ${act}`);
    }

    if (a.risks?.length) {
      console.log(chalk.bold("  Risks:"));
      for (const r of a.risks) console.log(`   - ${r}`);
    }
  }

  console.log(chalk.bold("\nVerifier:"));
  if (!verifierProblems || verifierProblems.length === 0) {
    console.log(chalk.green("  No issues found. Evidence backed claims are consistent."));
  } else {
    console.log(chalk.red("  Issues found:"));
    for (const p of verifierProblems) console.log(`   - ${p}`);
  }

  console.log(chalk.bold("\nFinal 60 to 90 day plan:"));
  for (const r of finalOut.recommendations_60_90_days || []) console.log(`  - ${r}`);

  console.log(chalk.bold("\nTrack next:"));
  for (const m of finalOut.what_to_measure_next || []) console.log(`  - ${m}`);

  console.log("");
}

function shouldWriteJson(argv) {
  return argv.includes("--json");
}

function getScenario(argv) {
  const a = argv.find((x) => x.startsWith("--scenario="));
  return a ? a.split("=")[1] : "";
}

// -----------------------------
// main
// -----------------------------
async function main() {
  const argv = process.argv.slice(2);

  const scenario = getScenario(argv);
  const question = argv.filter((a) => a !== "--json" && !a.startsWith("--scenario=")).join(" ").trim();

  if (!question) {
    console.error('Provide a question in quotes, example: node .\\econ_cli_noopenai.mjs "question here"');
    console.error("Optional flags: --json, --scenario=high_gas, --scenario=high_unemployment, --scenario=high_rent, --scenario=cooling_inflation");
    process.exit(1);
  }

  const evidenceRaw = await getEvidence();
  const evidence = scenario ? applyScenarioOverrides(evidenceRaw, scenario) : evidenceRaw;

  const subOutputs = [
    pricesAgent(evidence),
    jobsAgent(evidence),
    energyAgent(evidence),
    transportationAgent(),
  ];

  const verifierProblems = verifier(subOutputs, evidence);
  const finalOut = economyAgentFinal(question, evidence, subOutputs, verifierProblems);

  printReport({ scenario, question, evidence, subOutputs, verifierProblems, finalOut });

  if (shouldWriteJson(argv)) {
    const payload = { scenario, question, evidence, subOutputs, verifierProblems, finalOut };
    fs.writeFileSync("./econ_demo_output.json", JSON.stringify(payload, null, 2), "utf8");
    console.log(chalk.gray("Wrote econ_demo_output.json"));
  }
}

main().catch((e) => {
  console.error("Fatal error:", e?.message || e);
  process.exit(1);
});