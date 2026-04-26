import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env — always override so Windows system env vars don't block file values
for (const p of [resolve(__dirname, "../.env"), resolve(__dirname, ".env")]) {
  try {
    const lines = readFileSync(p, "utf8").split(/\r?\n/);
    let loaded = 0;
    for (const line of lines) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) { process.env[m[1]] = m[2].trim(); loaded++; }
    }
    console.log(`[env] Loaded ${loaded} vars from ${p}`);
  } catch { /* file not found */ }
}

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json());

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── FRED helpers ─────────────────────────────────────────────────────────────

const FRED_SERIES = {
  CPI: "CPIAUCSL",
  CORE_CPI: "CPILFESL",
  UNEMPLOYMENT: "UNRATE",
  PAYROLLS: "PAYEMS",
  WAGES: "CES0500000003",
  GAS_PRICE: "GASREGW",
  OIL_PRICE_WTI: "DCOILWTICO",
};

async function fredLatest(seriesId) {
  // Strip ALL non-alphanumeric chars (handles \r, BOM, invisible Unicode, etc.)
  const fredKey = (process.env.FRED_API_KEY ?? "").replace(/[^a-z0-9]/g, "");
  if (!fredKey || fredKey.length !== 32) return null;

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("api_key", fredKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`FRED ${seriesId} → HTTP ${res.status}: ${body}`);
      return null;
    }
    const data = await res.json();
    const obs = data.observations?.[0];
    if (!obs) return null;
    const value = Number(obs.value);
    return Number.isFinite(value)
      ? { seriesId, lastValue: value, lastDate: obs.date ?? null }
      : null;
  } catch (e) {
    console.warn(`FRED ${seriesId} fetch error:`, e.message);
    return null;
  }
}

async function fetchEconomicData() {
  const entries = Object.entries(FRED_SERIES);
  const results = await Promise.all(
    entries.map(([name, id]) => fredLatest(id).then((r) => (r ? { name, ...r } : null)))
  );
  const valid = results.filter(Boolean);
  return valid.length > 0 ? valid : null;
}

// ── News helpers (Guardian API — free, no key required) ───────────────────────

const DOMAIN_NEWS_QUERIES = {
  "Economy":                    "US economy inflation federal reserve GDP",
  "National Security":          "US national security terrorism intelligence CIA",
  "Domestic Policy":            "US domestic policy congress legislation White House",
  "International Relations":    "US foreign policy diplomacy alliances United Nations",
  "Military & Defense":         "US military pentagon defense readiness operations",
  "Jobs & Employment":          "US employment jobs labor market wages workforce",
  "Trade & Commerce":           "US trade tariffs exports imports supply chain",
  "Energy & Environment":       "US energy climate environment oil renewables EPA",
  "Healthcare & Public Health": "US healthcare public health pandemic CDC FDA",
  "Technology & Cybersecurity": "US technology cybersecurity AI artificial intelligence cyber attack",
};

async function fetchDomainNews(domain) {
  const query = DOMAIN_NEWS_QUERIES[domain];
  if (!query) return [];
  try {
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&show-fields=headline&page-size=5&order-by=newest&api-key=test`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response?.results ?? []).map((a) => ({
      title: a.webTitle,
      date: a.webPublicationDate?.slice(0, 10) ?? "",
    }));
  } catch {
    return [];
  }
}

function buildSystemPrompt(systemPromptText, news) {
  if (!news?.length) return systemPromptText;
  const headlines = news.map((n) => `• ${n.title} (${n.date})`).join("\n");
  return `${systemPromptText}\n\nLIVE NEWS HEADLINES (${new Date().toLocaleDateString()}):\n${headlines}`;
}

// ── Domain system prompts ─────────────────────────────────────────────────────

const DOMAIN_PROMPTS = {
  Economy: (data) => `You are SENTINEL's Economy Intelligence Agent, briefing the President of the United States.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the single most important economic fact right now.

## Key Indicators
${data ? `LIVE DATA:\n${data.map((d) => `  ${d.name}: ${d.lastValue} (${d.lastDate})`).join("\n")}\n` : ""}Up to 5 bullet points with values and one-word status (↑ ↓ →).

## What This Means for Americans
3 bullet points max. Plain language, no jargon.

## Policy Options
Exactly 3 options. Each: bold title + 1 sentence description.

## Watch Next
3 bullet points only — upcoming data or events that could change the picture.`,

  "National Security": () => `You are SENTINEL's National Security Intelligence Agent, briefing the President of the United States.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most urgent national security concern right now.

## Active Threats
3 bullet points max — current, specific, prioritized.

## Defense Posture
2-3 sentences on readiness status and any gaps.

## Recommended Actions
Exactly 3 options. Each: bold title + 1 sentence.

## Intelligence Gaps
2 bullet points — what we don't know that matters.`,

  "Domestic Policy": () => `You are SENTINEL's Domestic Policy Intelligence Agent, briefing the President of the United States.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most pressing domestic issue requiring presidential attention today.

## Priority Issues
Top 3 issues only — one bullet each with brief context.

## Public Sentiment
2-3 sentences on relevant polling trends or public mood.

## Legislative Opportunities
2 bullet points — what can realistically move in Congress now.

## Risk Areas
2 bullet points — potential flashpoints to watch.`,

  "International Relations": () => `You are SENTINEL's International Relations Intelligence Agent, briefing the President of the United States.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most significant international development requiring attention today.

## Active Flashpoints
3 bullet points max — ongoing tensions or crises, prioritized by urgency.

## Alliance Status
2-3 sentences on key ally relationships and any friction points.

## Diplomatic Opportunities
2 bullet points — openings to advance US interests.

## Strategic Risks
2 bullet points — threats to US global standing or security.`,

  "Military & Defense": () => `You are SENTINEL's Military & Defense Intelligence Agent, briefing the President of the United States.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most critical military or defense concern today.

## Force Readiness
2-3 sentences — overall status, any degraded capabilities.

## Active Operations
3 bullet points max — current deployments or engagements worth noting.

## Capability Gaps
2 bullet points — areas of concern in the defense posture.

## Recommended Actions
Exactly 3 options. Each: bold title + 1 sentence.`,

  "Jobs & Employment": () => `You are SENTINEL's Labor & Employment Intelligence Agent, briefing the President of the United States.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most important labor market signal right now.

## Labor Market Snapshot
3 bullet points — key metrics with values where available (unemployment, payrolls, wages).

## Trend to Watch
2-3 sentences on the most significant emerging shift (sector, demographic, automation).

## Vulnerable Groups
2 bullet points — populations facing the greatest employment challenges.

## Policy Options
Exactly 3 options. Each: bold title + 1 sentence.`,

  "Trade & Commerce": () => `You are SENTINEL's Trade & Commerce Intelligence Agent, briefing the President of the United States.
Focus strictly on trade flows, tariffs, import/export policy, WTO, and supply chains — not broader diplomacy.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most important trade or supply chain development right now.

## Trade Position
2-3 sentences — current deficit/surplus trend, top trading partners, key imbalances.

## Active Disputes & Negotiations
3 bullet points max — ongoing tariff disputes, trade deals, or WTO cases.

## Supply Chain Risks
2 bullet points — critical vulnerabilities (semiconductors, rare earths, pharmaceuticals, etc.).

## Policy Options
Exactly 3 options. Each: bold title + 1 sentence.`,

  "Energy & Environment": () => `You are SENTINEL's Energy & Environment Intelligence Agent, briefing the President of the United States.
Focus on energy security, fossil fuel markets, renewable transition, climate commitments, and EPA regulatory posture.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most pressing energy or environmental issue requiring presidential attention today.

## Energy Security Status
2-3 sentences — domestic production, strategic reserves, grid vulnerability, fuel price trends.

## Climate & Regulatory Landscape
2 bullet points — major climate commitments or EPA actions in play.

## Emerging Risks
2 bullet points — energy supply shocks, extreme weather events, or infrastructure threats.

## Policy Options
Exactly 3 options. Each: bold title + 1 sentence.`,

  "Healthcare & Public Health": () => `You are SENTINEL's Healthcare & Public Health Intelligence Agent, briefing the President of the United States.
Focus on healthcare affordability, pandemic preparedness, FDA/CDC actions, public health emergencies, and drug pricing.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most urgent public health or healthcare policy issue right now.

## System Status
2-3 sentences — overall US healthcare system stress, insurance coverage gaps, hospital capacity.

## Active Health Threats
3 bullet points max — disease outbreaks, drug shortages, or emerging public health risks.

## Policy Priorities
2 bullet points — legislation or executive actions with near-term impact on Americans' health.

## Policy Options
Exactly 3 options. Each: bold title + 1 sentence.`,

  "Technology & Cybersecurity": () => `You are SENTINEL's Technology & Cybersecurity Intelligence Agent, briefing the President of the United States.
Focus on cyber threats to critical infrastructure, AI policy, semiconductor supply chains, big tech regulation, and digital competition with adversaries.
Be concise. No preamble, no sign-off. Use exactly these markdown sections with ## headers:

## Bottom Line Up Front
One sentence: the most critical technology or cybersecurity threat facing the US today.

## Cyber Threat Landscape
3 bullet points max — active threats to infrastructure, government systems, or critical sectors. Name adversaries where known.

## AI & Tech Policy
2-3 sentences — where US stands on AI regulation, chip export controls, and tech competition with China.

## Vulnerabilities
2 bullet points — exposed systems or capability gaps that could be exploited.

## Policy Options
Exactly 3 options. Each: bold title + 1 sentence.`,
};

const DOMAIN_ORDER = [
  "Economy",
  "National Security",
  "Domestic Policy",
  "International Relations",
  "Military & Defense",
  "Jobs & Employment",
  "Trade & Commerce",
  "Energy & Environment",
  "Healthcare & Public Health",
  "Technology & Cybersecurity",
];

// ── Claude stream helper ──────────────────────────────────────────────────────

async function* streamClaude(systemPrompt, userMessage, maxTokens = 2048) {
  const stream = claude.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Threat level assessment for all domains (homepage dashboard)
app.get("/api/threat", async (req, res) => {
  try {
    const domains = DOMAIN_ORDER.join(", ");
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: `You are SENTINEL's threat assessment system. Rate the current threat level for each US policy domain as LOW, ELEVATED, HIGH, or CRITICAL based on today's real-world conditions. Return ONLY a valid JSON array with no extra text:
[{"domain": "...", "level": "LOW|ELEVATED|HIGH|CRITICAL", "reason": "one sentence max"}]
Domains to rate: ${domains}`,
        },
      ],
    });
    const text = response.content[0]?.text ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const json = JSON.parse(match?.[0] ?? "[]");
    res.json(json);
  } catch (e) {
    console.error("Threat endpoint error:", e);
    res.json([]);
  }
});

// FRED data endpoint for charts
app.get("/api/fred-data", async (req, res) => {
  try {
    const entries = Object.entries(FRED_SERIES);
    const results = await Promise.all(
      entries.map(([name, id]) => fredLatest(id).then((r) => (r ? { name, ...r } : null)))
    );
    res.json(results.filter(Boolean));
  } catch (e) {
    res.json([]);
  }
});

// Per-domain FRED chart data
const DOMAIN_FRED = {
  "Economy": [
    { key: "CPI",         id: "CPIAUCSL",      label: "CPI",            color: "#f97316" },
    { key: "Core CPI",    id: "CPILFESL",      label: "Core CPI",       color: "#fb923c" },
    { key: "Unemploy",    id: "UNRATE",        label: "Unemploy. %",    color: "#ef4444" },
    { key: "Payrolls",    id: "PAYEMS",        label: "Payrolls (K)",   color: "#60a5fa" },
    { key: "Wages",       id: "CES0500000003", label: "Wages $/hr",     color: "#4ade80" },
    { key: "Gas",         id: "GASREGW",       label: "Gas $/gal",      color: "#facc15" },
    { key: "WTI Oil",     id: "DCOILWTICO",    label: "Oil $/bbl",      color: "#a78bfa" },
  ],
  "Jobs & Employment": [
    { key: "Unemploy",    id: "UNRATE",        label: "Unemploy. %",    color: "#ef4444" },
    { key: "Labor Part",  id: "CIVPART",       label: "Labor Part. %",  color: "#60a5fa" },
    { key: "Job Opens",   id: "JTSJOL",        label: "Openings (K)",   color: "#4ade80" },
    { key: "Wages",       id: "CES0500000003", label: "Wages $/hr",     color: "#facc15" },
    { key: "Wkly Hours",  id: "AWHAETP",       label: "Avg Wkly Hrs",   color: "#a78bfa" },
  ],
  "Trade & Commerce": [
    { key: "Trade Bal",   id: "BOPGSTB",       label: "Trade Bal $B",   color: "#f97316" },
    { key: "Exports",     id: "EXPGS",         label: "Exports $B",     color: "#4ade80" },
    { key: "Imports",     id: "IMPGS",         label: "Imports $B",     color: "#ef4444" },
  ],
  "Energy & Environment": [
    { key: "Gas",         id: "GASREGW",       label: "Gas $/gal",      color: "#facc15" },
    { key: "WTI Oil",     id: "DCOILWTICO",    label: "Oil $/bbl",      color: "#f97316" },
    { key: "Natural Gas", id: "MHHNGSP",       label: "Nat Gas $/MMBtu",color: "#60a5fa" },
  ],
  "Healthcare & Public Health": [
    { key: "Medical CPI", id: "CPIMEDSL",      label: "Medical CPI",    color: "#f43f5e" },
    { key: "Med Services",id: "CPIMEDSV",      label: "Med Services CPI",color: "#fb7185" },
  ],
  "Military & Defense": [
    { key: "Defense $B",  id: "FDEFX",         label: "Defense Spend $B",color: "#60a5fa" },
  ],
  "Domestic Policy": [
    { key: "Fed Debt $B", id: "GFDEBTN",       label: "Fed Debt $B",    color: "#a78bfa" },
    { key: "Debt % GDP",  id: "GFDEGDQ188S",   label: "Debt % GDP",     color: "#818cf8" },
  ],
};

app.get("/api/fred-domain", async (req, res) => {
  const domain = req.query.domain ?? "";
  const series = DOMAIN_FRED[domain];
  if (!series?.length) return res.json([]);
  try {
    const results = await Promise.all(
      series.map(({ key, id, label, color }) =>
        fredLatest(id).then((r) => (r ? { key, label, color, ...r } : null))
      )
    );
    res.json(results.filter(Boolean));
  } catch (e) {
    res.json([]);
  }
});

// Streaming conversational chat
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { domain, messages, scenarioMode } = req.body;
    if (!domain) return res.status(400).json({ error: "domain is required" });
    if (!messages?.length) return res.status(400).json({ error: "messages is required" });

    let economicData = null;
    if (domain === "Economy") economicData = await fetchEconomicData();

    const systemPromptFn = DOMAIN_PROMPTS[domain];
    if (!systemPromptFn) return res.status(400).json({ error: `Unknown domain: ${domain}` });

    const basePrompt = systemPromptFn(economicData);
    const news = await fetchDomainNews(domain);
    let systemPrompt = buildSystemPrompt(basePrompt, news);

    if (scenarioMode) {
      systemPrompt = `${systemPrompt}\n\n[SCENARIO SIMULATION MODE ACTIVE] The President is testing a hypothetical scenario. Analyze cascading consequences, second and third-order effects, and concrete response options. Cover military, economic, diplomatic, and domestic angles as relevant.`;
    }

    const claudeMessages = messages.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = claude.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt,
      messages: claudeMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e?.message || String(e) });
    else { res.write(`data: ${JSON.stringify({ error: e?.message })}\n\n`); res.end(); }
  }
});

// Full Presidential Daily Brief — streams all domains then synthesis
app.get("/api/pdb/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const write = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const briefingTexts = {};

  try {
    for (const domain of DOMAIN_ORDER) {
      const systemPromptFn = DOMAIN_PROMPTS[domain];
      if (!systemPromptFn) continue;

      let economicData = null;
      if (domain === "Economy") economicData = await fetchEconomicData();

      const basePrompt = systemPromptFn(economicData);
      const news = await fetchDomainNews(domain);
      const systemPrompt = buildSystemPrompt(basePrompt, news);
      const userMessage = `Generate the daily ${domain} briefing for the President.`;

      let domainText = "";
      for await (const chunk of streamClaude(systemPrompt, userMessage, 900)) {
        domainText += chunk;
        write({ type: "chunk", domain, text: chunk });
      }
      briefingTexts[domain] = domainText;
      write({ type: "domain_done", domain });
    }

    // Cross-domain synthesis
    write({ type: "synthesis_start" });
    const summaries = DOMAIN_ORDER.map(
      (d) => `=== ${d.toUpperCase()} ===\n${briefingTexts[d]?.slice(0, 600) ?? "No data"}`
    ).join("\n\n");

    const synthesisPrompt = `You are SENTINEL's strategic synthesis engine. You have received briefings from all domain intelligence agents. Your job is to identify:
1. The most critical cross-domain threats and interdependencies
2. The single most important action the President should take today
3. Emerging situations that could escalate across multiple domains

Be concise, direct, and presidential. Classify as TOP SECRET // SCI // NOFORN.`;

    for await (const chunk of streamClaude(
      synthesisPrompt,
      `Domain briefings for synthesis:\n\n${summaries}`,
      800
    )) {
      write({ type: "chunk", domain: "Cross-Domain Analysis", text: chunk });
    }
    write({ type: "domain_done", domain: "Cross-Domain Analysis" });
    res.write("data: [DONE]\n\n");
  } catch (e) {
    console.error("PDB stream error:", e);
    write({ type: "error", message: e?.message });
    res.write("data: [DONE]\n\n");
  }
  res.end();
});

app.get("/health", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  const fredKey = (process.env.FRED_API_KEY ?? "").replace(/[^a-z0-9]/g, "");
  console.log(`SENTINEL backend listening on port ${port}`);
  console.log(`FRED key: ${fredKey ? `${fredKey.slice(0,4)}…${fredKey.slice(-4)} (${fredKey.length} chars)` : "NOT SET"}`);
  console.log(`Claude key: ${process.env.ANTHROPIC_API_KEY ? "set" : "NOT SET"}`);
});
