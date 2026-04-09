import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json());

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── FRED helpers ────────────────────────────────────────────────────────────

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
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey || fredKey === "your_fred_key_here") {
    return { seriesId, lastValue: null, lastDate: null, note: "FRED_API_KEY not set" };
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("api_key", fredKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return { seriesId, lastValue: null, lastDate: null, note: `FRED error ${res.status}` };

  const data = await res.json();
  const obs = data.observations?.[0];
  if (!obs) return { seriesId, lastValue: null, lastDate: null, note: "No data" };

  const value = Number(obs.value);
  return {
    seriesId,
    lastValue: Number.isFinite(value) ? value : null,
    lastDate: obs.date ?? null,
  };
}

async function fetchEconomicData() {
  const results = await Promise.all(Object.values(FRED_SERIES).map(fredLatest));
  return results;
}

// ── Domain system prompts ────────────────────────────────────────────────────

const DOMAIN_PROMPTS = {
  Economy: (data) => `You are SENTINEL's Economy Intelligence Agent, briefing the President of the United States.
Your role: analyze economic conditions and provide a clear, actionable presidential briefing.

${data ? `LIVE ECONOMIC DATA (FRED):\n${JSON.stringify(data, null, 2)}\n` : ""}
Format your response as a structured briefing with:
- **Situation Summary** (2-3 sentences)
- **Key Indicators** (bullet points with data if available)
- **What This Means** (impact for Americans)
- **Policy Options** (2-3 concrete options for the President)
- **Watch Next** (what to monitor)

Be direct, factual, and concise. Classify as TOP SECRET.`,

  "National Security": () => `You are SENTINEL's National Security Intelligence Agent, briefing the President of the United States.
Your role: synthesize national security threats, defense readiness, and cybersecurity posture.

Format your response as a structured briefing with:
- **Threat Assessment** (current threat level and summary)
- **Active Concerns** (bullet points on top threats)
- **Defense Posture** (current readiness status)
- **Recommended Actions** (2-3 immediate actions for consideration)
- **Intelligence Gaps** (what remains unknown)

Be direct and factual. Classify as TOP SECRET / SCI.`,

  "Domestic Policy": () => `You are SENTINEL's Domestic Policy Intelligence Agent, briefing the President of the United States.
Your role: assess the domestic political landscape, public priorities, and policy opportunities.

Format your response as a structured briefing with:
- **Domestic Landscape** (current state of major domestic issues)
- **Priority Issues** (top 3-4 issues requiring presidential attention)
- **Public Sentiment** (key trends in public opinion)
- **Legislative Opportunities** (what can move forward)
- **Risk Areas** (potential flashpoints)

Be direct and strategic. Classify as CONFIDENTIAL.`,

  "International Relations": () => `You are SENTINEL's International Relations Intelligence Agent, briefing the President of the United States.
Your role: assess the global diplomatic landscape, alliances, and geopolitical risks.

Format your response as a structured briefing with:
- **Global Situation** (overview of key international dynamics)
- **Priority Relationships** (allies and adversaries requiring attention)
- **Active Flashpoints** (ongoing tensions or crises)
- **Diplomatic Opportunities** (openings to advance US interests)
- **Strategic Risks** (threats to US global position)

Be direct and strategic. Classify as TOP SECRET.`,
};

// ── Claude helper ────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage) {
  const response = await claude.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content.find((b) => b.type === "text")?.text ?? "";
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Generate a domain briefing
app.post("/api/brief", async (req, res) => {
  try {
    const { domain, question } = req.body;
    if (!domain) return res.status(400).json({ error: "domain is required" });

    let economicData = null;
    if (domain === "Economy") {
      economicData = await fetchEconomicData();
    }

    const systemPromptFn = DOMAIN_PROMPTS[domain];
    if (!systemPromptFn) return res.status(400).json({ error: `Unknown domain: ${domain}` });

    const systemPrompt = systemPromptFn(economicData);
    const userMessage = question?.trim()
      ? `Question from the President: ${question}`
      : `Generate the daily ${domain} briefing for the President.`;

    const briefing = await callClaude(systemPrompt, userMessage);
    res.json({ domain, briefing, economicData });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Conversational chat within a domain
app.post("/api/chat", async (req, res) => {
  try {
    const { domain, messages } = req.body;
    if (!domain) return res.status(400).json({ error: "domain is required" });
    if (!messages?.length) return res.status(400).json({ error: "messages is required" });

    let economicData = null;
    if (domain === "Economy") {
      economicData = await fetchEconomicData();
    }

    const systemPromptFn = DOMAIN_PROMPTS[domain];
    if (!systemPromptFn) return res.status(400).json({ error: `Unknown domain: ${domain}` });

    const systemPrompt = systemPromptFn(economicData);

    const claudeMessages = messages.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await claude.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: claudeMessages,
    });

    const reply = response.content.find((b) => b.type === "text")?.text ?? "";
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/health", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`SENTINEL backend listening on port ${port}`));
