// gcp-backend/server.mjs
import express from "express";

const app = express();
app.use(express.json());

const SERIES = {
  CPI: "CPIAUCSL",
  CORE_CPI: "CPILFESL",
  UNEMPLOYMENT: "UNRATE",
  PAYROLLS: "PAYEMS",
  WAGES: "CES0500000003",
  GAS_PRICE: "GASREGW",
  OIL_PRICE_WTI: "DCOILWTICO",
};

function hasAny(q, words) {
  return words.some((w) => q.includes(w));
}

function pickMetrics(question) {
  const q = question.toLowerCase();
  const wanted = new Set();

  const priceWords = ["price", "inflation", "rent", "grocery", "cost of living", "cpi", "utilities"];
  const laborWords = ["jobs", "unemployment", "labor", "wage", "layoff", "hiring", "payroll"];
  const energyWords = ["gas", "gasoline", "oil", "energy", "diesel", "refinery", "opec", "barrel"];
  const transportWords = ["transport", "traffic", "roads", "bridge", "rail", "transit", "port", "shipping", "freight", "supply chain"];

  if (hasAny(q, priceWords)) {
    wanted.add(SERIES.CPI);
    wanted.add(SERIES.CORE_CPI);
  }

  if (hasAny(q, laborWords)) {
    wanted.add(SERIES.UNEMPLOYMENT);
    wanted.add(SERIES.PAYROLLS);
    wanted.add(SERIES.WAGES);
  }

  if (hasAny(q, energyWords)) {
    wanted.add(SERIES.GAS_PRICE);
    wanted.add(SERIES.OIL_PRICE_WTI);
  }

  if (hasAny(q, transportWords)) {
    wanted.add(SERIES.GAS_PRICE);
  }

  if (wanted.size === 0) {
    wanted.add(SERIES.CPI);
    wanted.add(SERIES.UNEMPLOYMENT);
    wanted.add(SERIES.PAYROLLS);
    wanted.add(SERIES.GAS_PRICE);
  }

  return [...wanted];
}

async function fredLatest(seriesId) {
  const fredKey = process.env.FRED_API_KEY;

  if (!fredKey) {
    return { seriesId, lastValue: null, lastDate: null, source: "FRED", note: "Missing FRED_API_KEY" };
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("api_key", fredKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    return { seriesId, lastValue: null, lastDate: null, source: "FRED", note: `FRED error ${res.status}: ${text}` };
  }

  const data = await res.json();
  const obs = data.observations?.[0];
  if (!obs) return { seriesId, lastValue: null, lastDate: null, source: "FRED", note: "No observations" };

  const value = Number(obs.value);
  return {
    seriesId,
    lastValue: Number.isFinite(value) ? value : null,
    lastDate: obs.date ?? null,
    source: "FRED",
  };
}

async function openaiChat({ system, user }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function runAgents(question) {
  const q = question.toLowerCase();

  const wantsPrices = hasAny(q, ["price", "inflation", "rent", "grocery", "cost of living", "cpi", "utilities"]);
  const wantsJobs = hasAny(q, ["jobs", "unemployment", "labor", "wage", "layoff", "hiring", "payroll"]);
  const wantsEnergy = hasAny(q, ["gas", "gasoline", "oil", "energy", "diesel", "refinery", "opec", "barrel"]);
  const wantsTransport = hasAny(q, ["transport", "traffic", "roads", "bridge", "rail", "transit", "port", "shipping", "freight", "supply chain"]);

  const runDefault = !wantsPrices && !wantsJobs && !wantsEnergy && !wantsTransport;

  const evidence = [];
  for (const id of pickMetrics(question)) evidence.push(await fredLatest(id));

  const payload = JSON.stringify({ question, evidence }, null, 2);

  const drafts = {};

  if (wantsPrices || runDefault) {
    drafts.prices_cost_of_living = await openaiChat({
      system:
        "You are the Prices and Cost of Living Agent for a presidential briefing. Use only the evidence provided. If unsupported, say you cannot verify. Output 4 to 7 bullets.",
      user: payload,
    });
  }

  if (wantsJobs || runDefault) {
    drafts.jobs_and_labor = await openaiChat({
      system:
        "You are the Jobs and Labor Agent for a presidential briefing. Use only the evidence provided. If unsupported, say you cannot verify. Output 4 to 7 bullets.",
      user: payload,
    });
  }

  if (wantsEnergy) {
    drafts.energy_and_oil = await openaiChat({
      system:
        "You are the Energy and Oil Agent for a presidential briefing. Use only the evidence provided. If unsupported, say you cannot verify. Output 4 to 7 bullets.",
      user: payload,
    });
  }

  if (wantsTransport) {
    drafts.transportation_and_infrastructure = await openaiChat({
      system:
        "You are the Transportation and Infrastructure Agent for a presidential briefing. Use only the evidence provided. If unsupported, say you cannot verify. Output 4 to 7 bullets.",
      user: payload,
    });
  }

  const options = await openaiChat({
    system:
      "You are the Policy Options Agent. Provide 2 to 4 realistic options for the President. For each: action, upside, downside, timeline, risks. Do not invent statistics. Numbers must appear in evidence.",
    user: payload,
  });

  const factCheck = await openaiChat({
    system: "You are the Fact Check Agent. Compare drafts and options to evidence. Return JSON only with keys supported, unsupported, fixes.",
    user: JSON.stringify({ drafts, options, evidence }, null, 2),
  });

  return { evidence, drafts, options, factCheck };
}

app.post("/economy/brief", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "question is required" });

    const result = await runAgents(question);
    res.json({ question, ...result });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/health", (req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on ${port}`));