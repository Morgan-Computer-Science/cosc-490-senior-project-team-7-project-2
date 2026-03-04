// src/agents/economyAgents.mjs

const FRED_BASE = "https://api.stlouisfed.org/fred";

export const SERIES = {
  CPI: "CPIAUCSL",
  CORE_CPI: "CPILFESL",
  UNEMPLOYMENT: "UNRATE",
  PAYROLLS: "PAYEMS",
  WAGES: "CES0500000003",
  GAS_PRICE: "GASREGW",
};

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function openaiChat({ system, user, model = "gpt-4.1-mini" }) {
  const key = mustGetEnv("OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function fredLatest(seriesId) {
  const fredKey = process.env.FRED_API_KEY;

  if (!fredKey) {
    return {
      seriesId,
      lastValue: null,
      lastDate: null,
      source: "FRED",
      note: "Missing FRED_API_KEY so no live data was retrieved",
    };
  }

  const url = new URL(`${FRED_BASE}/series/observations`);
  url.searchParams.set("api_key", fredKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    return {
      seriesId,
      lastValue: null,
      lastDate: null,
      source: "FRED",
      note: `FRED error ${res.status}: ${text}`,
    };
  }

  const data = await res.json();
  const obs = data.observations?.[0];
  if (!obs) {
    return { seriesId, lastValue: null, lastDate: null, source: "FRED", note: "No observations returned" };
  }

  const value = Number(obs.value);
  return {
    seriesId,
    lastValue: Number.isFinite(value) ? value : null,
    lastDate: obs.date ?? null,
    source: "FRED",
  };
}

function pickMetrics(question) {
  const q = question.toLowerCase();
  const wanted = new Set();

  const priceWords = ["price", "inflation", "rent", "grocery", "cost of living", "gas", "utilities"];
  const laborWords = ["jobs", "unemployment", "labor", "wage", "layoff", "hiring", "openings"];

  if (priceWords.some(w => q.includes(w))) {
    wanted.add(SERIES.CPI);
    wanted.add(SERIES.CORE_CPI);
    wanted.add(SERIES.GAS_PRICE);
  }

  if (laborWords.some(w => q.includes(w))) {
    wanted.add(SERIES.UNEMPLOYMENT);
    wanted.add(SERIES.PAYROLLS);
    wanted.add(SERIES.WAGES);
  }

  if (wanted.size === 0) {
    wanted.add(SERIES.CPI);
    wanted.add(SERIES.UNEMPLOYMENT);
    wanted.add(SERIES.PAYROLLS);
  }

  return [...wanted];
}

export class DataRetrieverAgent {
  async run(question) {
    const metrics = pickMetrics(question);
    const evidence = [];
    for (const id of metrics) {
      evidence.push(await fredLatest(id));
    }
    return { evidence };
  }
}

export class PricesCostOfLivingAgent {
  async run(question, evidence) {
    const system =
      "You are the Prices and Cost of Living Agent for a presidential decision brief.\n" +
      "Use only the evidence provided.\n" +
      "If a claim is not supported by the evidence, say you cannot verify it.\n" +
      "Avoid inventing numbers.\n" +
      "Output 4 to 7 bullets max.";

    const user = JSON.stringify({ question, evidence }, null, 2);
    const text = await openaiChat({ system, user });
    return { analysis: text };
  }
}

export class JobsLaborAgent {
  async run(question, evidence) {
    const system =
      "You are the Jobs and Labor Agent for a presidential decision brief.\n" +
      "Use only the evidence provided.\n" +
      "If a claim is not supported by the evidence, say you cannot verify it.\n" +
      "Avoid inventing numbers.\n" +
      "Output 4 to 7 bullets max.";

    const user = JSON.stringify({ question, evidence }, null, 2);
    const text = await openaiChat({ system, user });
    return { analysis: text };
  }
}

export class PolicyOptionsAgent {
  async run(question, evidence) {
    const system =
      "You are the Policy Options Agent.\n" +
      "Give 2 to 4 realistic options.\n" +
      "For each option include: what it is, expected benefit, downside, timeline, risk.\n" +
      "Do not invent statistics.\n" +
      "If you reference a number, it must appear in the evidence.";

    const user = JSON.stringify({ question, evidence }, null, 2);
    const text = await openaiChat({ system, user });
    return { options: text };
  }
}

export class FactCheckAgent {
  async run(drafts, evidence) {
    const system =
      "You are the Fact Check Agent.\n" +
      "Your job is to find statements that are not supported by the evidence.\n" +
      "Return JSON only with keys: supported, unsupported, fixes.\n" +
      "supported: array of short supported claims.\n" +
      "unsupported: array of short unsupported claims.\n" +
      "fixes: array of rewrite suggestions for unsupported items that remove certainty.\n" +
      "If there are no unsupported claims, unsupported must be an empty array.";

    const user = JSON.stringify({ drafts, evidence }, null, 2);
    const text = await openaiChat({ system, user });

    // Best effort JSON parsing with a safe fallback
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return { factCheck: JSON.parse(text.slice(start, end + 1)) };
      }
    } catch (e) {}

    return {
      factCheck: {
        supported: [],
        unsupported: ["Fact check agent did not return valid JSON"],
        fixes: ["Retry the run or lower the draft length"],
      },
    };
  }
}

export class EconomyOrchestrator {
  constructor() {
    this.retriever = new DataRetrieverAgent();
    this.prices = new PricesCostOfLivingAgent();
    this.jobs = new JobsLaborAgent();
    this.policy = new PolicyOptionsAgent();
    this.factcheck = new FactCheckAgent();
  }

  async run(question) {
    const { evidence } = await this.retriever.run(question);

    const q = question.toLowerCase();
    const wantsPrices = ["price", "inflation", "rent", "grocery", "cost of living", "gas"].some(w => q.includes(w));
    const wantsJobs = ["jobs", "unemployment", "labor", "wage", "layoff", "hiring"].some(w => q.includes(w));

    const drafts = {};

    if (wantsPrices || (!wantsPrices && !wantsJobs)) {
      drafts.prices_cost_of_living = await this.prices.run(question, evidence);
    }
    if (wantsJobs || (!wantsPrices && !wantsJobs)) {
      drafts.jobs_and_labor = await this.jobs.run(question, evidence);
    }

    const options = await this.policy.run(question, evidence);
    const fc = await this.factcheck.run({ drafts, options }, evidence);

    return this.formatMemo({ question, evidence, drafts, options, factCheck: fc.factCheck });
  }

  formatMemo({ question, evidence, drafts, options, factCheck }) {
    const lines = [];

    lines.push("PRESIDENTIAL ECONOMY BRIEF");
    lines.push("");
    lines.push(`Question: ${question}`);
    lines.push("");

    lines.push("Evidence pulled (latest points):");
    for (const e of evidence) {
      const v = e.lastValue === null ? "null" : String(e.lastValue);
      const d = e.lastDate ?? "null";
      const note = e.note ? ` | note: ${e.note}` : "";
      lines.push(`- ${e.seriesId} value=${v} date=${d} source=${e.source}${note}`);
    }

    lines.push("");
    lines.push("Specialist analysis:");
    for (const [k, v] of Object.entries(drafts)) {
      lines.push("");
      lines.push(`[${k}]`);
      lines.push(v.analysis || "");
    }

    lines.push("");
    lines.push("Policy options:");
    lines.push(options.options || "");

    lines.push("");
    lines.push("Fact check result:");
    lines.push(JSON.stringify(factCheck, null, 2));

    lines.push("");
    lines.push("Confidence:");
    const missing = evidence.some(e => e.lastValue === null || e.lastDate === null);
    lines.push(missing ? "Medium or Low (some evidence missing)" : "High (evidence present)");

    return lines.join("\n");
  }
}