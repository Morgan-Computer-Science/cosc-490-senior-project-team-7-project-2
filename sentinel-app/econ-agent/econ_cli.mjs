import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FRED_KEY = process.env.FRED_API_KEY || "";
const MODEL = "gpt-5.2";

function mustGetQuestion() {
  const argv = process.argv.slice(2).join(" ").trim();
  if (argv) return argv;

  // Read stdin if no argv
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
  });
}

async function fetchFredLatest(seriesId) {
  if (!FRED_KEY) {
    return { ok: false, error: "FRED_API_KEY not set" };
  }

  const url =
    "https://api.stlouisfed.org/fred/series/observations" +
    `?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${encodeURIComponent(FRED_KEY)}` +
    `&file_type=json&sort_order=desc&limit=1`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return { ok: false, error: `FRED HTTP ${res.status}` };
    }
    const json = await res.json();
    const obs = json?.observations?.[0];
    const valueRaw = obs?.value;
    const date = obs?.date;

    if (!date || valueRaw == null || valueRaw === ".") {
      return { ok: false, error: "No observation returned" };
    }

    const value = Number(valueRaw);
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Non numeric value returned" };
    }

    return {
      ok: true,
      seriesId,
      date,
      value,
      source: "FRED",
      sourceUrl: "https://fred.stlouisfed.org/series/" + seriesId,
    };
  } catch (e) {
    return { ok: false, error: "fetch failed" };
  }
}

async function getMacroEvidence() {
  // Your assignment categories map cleanly to these:
  // Prices: CPI, CORE_CPI
  // Jobs: UNRATE, PAYEMS
  const SERIES = {
    CPI: "CPIAUCSL",
    CORE_CPI: "CPILFESL",
    UNEMPLOYMENT: "UNRATE",
    PAYROLLS: "PAYEMS",
  };

  const entries = await Promise.all(
    Object.entries(SERIES).map(async ([name, id]) => {
      const r = await fetchFredLatest(id);
      return [name, r];
    })
  );

  const evidence = Object.fromEntries(entries);
  return evidence;
}

const AgentOutputSchema = z.object({
  agent: z.string(),
  classification: z.enum(["prices", "jobs", "energy", "transportation", "mixed"]),
  key_findings: z.array(z.string()).max(8),
  risks: z.array(z.string()).max(6),
  actions_60_90_days: z.array(z.string()).max(8),
  requires_more_data: z.boolean(),
  claims: z.array(
    z.object({
      claim: z.string(),
      support: z.enum(["evidence", "general", "none"]),
      evidence_keys: z.array(z.string()).max(6),
    })
  ),
});

async function runSubAgent({ name, focus, question, evidence }) {
  const instructions = `
You are ${name}. Focus: ${focus}.
Hard rule: do not invent numbers or facts. If you cannot support a claim with the provided evidence, mark its support as "general" (common policy reasoning) or "none".
Use evidence keys exactly as provided. Evidence keys available: ${Object.keys(evidence).join(", ")}.

Return ONLY valid JSON that matches this schema:
${JSON.stringify(AgentOutputSchema.shape, null, 2)}
`;

  const input = `
USER QUESTION:
${question}

EVIDENCE (JSON):
${JSON.stringify(evidence, null, 2)}
`;

  const resp = await client.responses.create({
    model: MODEL,
    instructions,
    input,
  });

  // openai-node Responses API example prints output_text. :contentReference[oaicite:1]{index=1}
  const txt = resp.output_text?.trim() || "";
  let parsed;
  try {
    parsed = JSON.parse(txt);
  } catch {
    return {
      agent: name,
      classification: "mixed",
      key_findings: [],
      risks: ["Model did not return valid JSON"],
      actions_60_90_days: [],
      requires_more_data: true,
      claims: [{ claim: "Invalid JSON from sub agent", support: "none", evidence_keys: [] }],
    };
  }

  const validated = AgentOutputSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      agent: name,
      classification: "mixed",
      key_findings: [],
      risks: ["Sub agent output failed schema validation"],
      actions_60_90_days: [],
      requires_more_data: true,
      claims: [{ claim: "Schema validation failed", support: "none", evidence_keys: [] }],
    };
  }

  return validated.data;
}

function verifyNoUnsupportedClaims(subOutputs, evidence) {
  const allowedKeys = new Set(Object.keys(evidence));
  const problems = [];

  for (const out of subOutputs) {
    for (const c of out.claims || []) {
      if (c.support === "evidence") {
        for (const k of c.evidence_keys || []) {
          if (!allowedKeys.has(k)) {
            problems.push(`${out.agent}: claim references unknown evidence key "${k}"`);
          }
          const ev = evidence[k];
          if (!ev || ev.ok !== true) {
            problems.push(`${out.agent}: claim marked evidence but evidence "${k}" is missing or not ok`);
          }
        }
      }
      if (c.support === "none") {
        problems.push(`${out.agent}: unsupported claim present -> "${c.claim}"`);
      }
    }
  }

  return problems;
}

async function runFinalEconomyAgent({ question, evidence, subOutputs, verifierProblems }) {
  const instructions = `
You are the Economy Agent advising the president.
You MUST follow this:
- If verifierProblems is non empty, do not repeat those claims.
- Do not invent numbers. If you cite a number, it must come from evidence where ok=true.
- Provide a 60 to 90 day plan with 5 to 8 actions.
- Separate "What we know from data" vs "What we recommend" vs "What we need next".

Output ONLY JSON with this schema:
{
  "topic": "economy",
  "what_we_know_from_data": string[],
  "recommendations_60_90_days": string[],
  "tradeoffs_and_risks": string[],
  "what_to_measure_next": string[],
  "evidence_used": { [key: string]: { "date": string, "value": number, "sourceUrl": string } }
}
`;

  const evidenceUsed = {};
  for (const [k, v] of Object.entries(evidence)) {
    if (v && v.ok === true) {
      evidenceUsed[k] = { date: v.date, value: v.value, sourceUrl: v.sourceUrl };
    }
  }

  const input = `
USER QUESTION:
${question}

EVIDENCE (only use if ok=true):
${JSON.stringify(evidence, null, 2)}

SUB AGENTS OUTPUTS:
${JSON.stringify(subOutputs, null, 2)}

VERIFIER PROBLEMS:
${JSON.stringify(verifierProblems, null, 2)}

EVIDENCE USED (pre filtered):
${JSON.stringify(evidenceUsed, null, 2)}
`;

  const resp = await client.responses.create({
    model: MODEL,
    instructions,
    input,
  });

  const txt = resp.output_text?.trim() || "";
  try {
    return JSON.parse(txt);
  } catch {
    return {
      topic: "economy",
      what_we_know_from_data: ["Final agent failed to return valid JSON"],
      recommendations_60_90_days: [],
      tradeoffs_and_risks: [],
      what_to_measure_next: [],
      evidence_used: evidenceUsed,
    };
  }
}

async function main() {
  const qMaybe = mustGetQuestion();
  const question = typeof qMaybe === "string" ? qMaybe : await qMaybe;

  if (!question) {
    console.error("Provide a question as args or via stdin.");
    process.exit(1);
  }

  const evidence = await getMacroEvidence();

  const subAgents = [
    { name: "Prices and Cost of Living Agent", focus: "inflation, rent pressure, food and essentials, purchasing power" },
    { name: "Jobs and Labor Agent", focus: "unemployment, hiring, wage pressure, layoffs, labor force health" },
    { name: "Energy and Oil Agent", focus: "gas prices drivers and short term stabilizers, energy shocks" },
    { name: "Transportation and Infrastructure Agent", focus: "port capacity, trucking, transit costs that feed inflation" },
  ];

  const subOutputs = [];
  for (const a of subAgents) {
    const out = await runSubAgent({
      name: a.name,
      focus: a.focus,
      question,
      evidence,
    });
    subOutputs.push(out);
  }

  const verifierProblems = verifyNoUnsupportedClaims(subOutputs, evidence);

  const finalOut = await runFinalEconomyAgent({
    question,
    evidence,
    subOutputs,
    verifierProblems,
  });

  console.log(JSON.stringify({ evidence, subOutputs, verifierProblems, finalOut }, null, 2));
}

main().catch((e) => {
  console.error("Fatal error:", e?.message || e);
  process.exit(1);
});