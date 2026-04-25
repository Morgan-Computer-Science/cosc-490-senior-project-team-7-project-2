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
  const fredKey = process.env.FRED_API_KEY?.trim();
  if (!fredKey || fredKey === "your_fred_key_here") return null;

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
  const results = await Promise.all(entries.map(([name, id]) =>
    fredLatest(id).then((r) => r ? { name, ...r } : null)
  ));
  // Only return valid results; if none, return null so the prompt skips live data
  const valid = results.filter(Boolean);
  return valid.length > 0 ? valid : null;
}

// ── Domain system prompts ────────────────────────────────────────────────────

const DOMAIN_PROMPTS = {
  Economy: (data) => `You are SENTINEL's Economy Intelligence Agent, briefing the President of the United States.
Your role: analyze economic conditions and provide a clear, actionable presidential briefing.

${data ? `LIVE ECONOMIC DATA (FRED — as of latest available):\n${data.map(d => `  ${d.name}: ${d.lastValue} (${d.lastDate})`).join("\n")}\n` : ""}
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

  "Military & Defense": () => `You are SENTINEL's Military & Defense Intelligence Agent, briefing the President of the United States.
Your role: assess U.S. military readiness, active operations, and global defense posture.

Format your response as a structured briefing with:
- **Force Readiness** (current status of U.S. military branches)
- **Active Operations** (ongoing deployments and missions)
- **Adversary Activity** (notable movements by China, Russia, or other actors)
- **Defense Priorities** (top procurement and capability gaps)
- **Recommended Actions** (2-3 options for the Commander in Chief)

Be direct and factual. Classify as TOP SECRET / SCI.`,

  "Jobs & Employment": () => `You are SENTINEL's Labor & Employment Intelligence Agent, briefing the President of the United States.
Your role: analyze U.S. labor market conditions and provide actionable policy guidance.

Format your response as a structured briefing with:
- **Labor Market Overview** (current employment landscape)
- **Key Indicators** (unemployment rate, job gains/losses, wage trends)
- **Sector Spotlight** (industries gaining or shedding jobs)
- **Vulnerable Populations** (groups facing the most pressure)
- **Policy Options** (2-3 concrete actions to support American workers)

Be direct and factual. Classify as CONFIDENTIAL.`,

  "Trade & Commerce": () => `You are SENTINEL's Trade & Commerce Intelligence Agent, briefing the President of the United States.
Your role: assess U.S. trade conditions, supply chain risks, and commercial competitiveness.

Format your response as a structured briefing with:
- **Trade Balance** (current deficit/surplus and trend)
- **Key Partners** (top trading relationships and tensions)
- **Tariff & Sanctions Impact** (effects on U.S. industries and consumers)
- **Supply Chain Risks** (critical dependencies and vulnerabilities)
- **Policy Options** (2-3 trade or commerce actions for consideration)

Be direct and factual. Classify as CONFIDENTIAL.`,
};

// ── Claude helper ────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage) {
  const response = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
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
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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

// Streaming conversational chat (text appears word-by-word)
app.post("/api/chat/stream", async (req, res) => {
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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = claude.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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
    if (!res.headersSent) {
      res.status(500).json({ error: e?.message || String(e) });
    } else {
      res.write(`data: ${JSON.stringify({ error: e?.message })}\n\n`);
      res.end();
    }
  }
});

// Presidential Daily Brief — all 7 agents stream simultaneously, then cross-domain synthesis
app.get("/api/pdb/stream", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const domains = Object.keys(DOMAIN_PROMPTS);
    const allBriefings = {};

    // Process in batches of 2 to stay within concurrent connection limits
    const BATCH_SIZE = 2;
    for (let i = 0; i < domains.length; i += BATCH_SIZE) {
      const batch = domains.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (domain) => {
          let economicData = null;
          if (domain === "Economy") economicData = await fetchEconomicData();
          const systemPrompt = DOMAIN_PROMPTS[domain](economicData);

          const stream = claude.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 600,
            system: systemPrompt,
            messages: [{ role: "user", content: `Generate a concise daily ${domain} presidential briefing. Under 200 words. Use the standard briefing format.` }],
          });

          let fullText = "";
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text;
              res.write(`data: ${JSON.stringify({ type: "chunk", domain, text: event.delta.text })}\n\n`);
            }
          }
          allBriefings[domain] = fullText;
          res.write(`data: ${JSON.stringify({ type: "domain_done", domain })}\n\n`);
        })
      );
    }

    // Cross-domain synthesis after all domains complete
    res.write(`data: ${JSON.stringify({ type: "synthesis_start" })}\n\n`);

    const briefingsSummary = Object.entries(allBriefings)
      .map(([d, b]) => `=== ${d} ===\n${b}`)
      .join("\n\n");

    const synthesisStream = claude.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: `You are SENTINEL's Chief Intelligence Analyst. Identify dangerous connections BETWEEN domains that individual advisors miss. Be direct, concise, and alarming where warranted. Classify TOP SECRET.`,
      messages: [{
        role: "user",
        content: `Analyze these briefings and identify cross-domain connections:\n\n${briefingsSummary}\n\nFormat your response as:\n**Cross-Domain Risks**\n- [risks that span multiple domains]\n\n**Compounding Effects**\n- [how one domain worsens another]\n\n**Top Priority Action**\n[single most critical recommendation for the President]\n\nUnder 200 words.`,
      }],
    });

    for await (const event of synthesisStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ type: "chunk", domain: "Cross-Domain Analysis", text: event.delta.text })}\n\n`);
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

// Quick threat level for every domain — powers the homepage dashboard
app.get("/api/threat", async (req, res) => {
  try {
    const domains = Object.keys(DOMAIN_PROMPTS);
    const results = [];

    // Process in batches of 3 to avoid concurrent connection limits
    const BATCH_SIZE = 3;
    for (let i = 0; i < domains.length; i += BATCH_SIZE) {
      const batch = domains.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (domain) => {
          try {
            const text = await callClaude(
              "You are a rapid threat assessment system. Respond ONLY with a valid JSON object and nothing else — no markdown, no explanation.",
              `Assess the current U.S. threat level for the domain: "${domain}". Return exactly: {"level":"ELEVATED","reason":"one short sentence"} where level is one of: LOW, ELEVATED, HIGH, CRITICAL.`
            );
            const match = text.match(/\{[^}]+\}/s);
            const json = JSON.parse(match?.[0] ?? text.trim());
            return { domain, level: json.level ?? "ELEVATED", reason: json.reason ?? "" };
          } catch {
            return { domain, level: "ELEVATED", reason: "Assessment pending" };
          }
        })
      );
      results.push(...batchResults);
    }

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/health", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`SENTINEL backend listening on port ${port}`));
