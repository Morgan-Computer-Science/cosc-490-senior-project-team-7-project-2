import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./homepage.css";

const DOMAIN_BUTTONS = [
  { label: "Economy",                     domain: "Economy",                     cls: "economy_btn" },
  { label: "National Security",           domain: "National Security",           cls: "nationalSecurity_btn" },
  { label: "Domestic Policy",             domain: "Domestic Policy",             cls: "domesticPolicy_btn" },
  { label: "International Relations",     domain: "International Relations",     cls: "internationalRelation_btn" },
  { label: "Military & Defense",          domain: "Military & Defense",          cls: "nationalSecurity_btn" },
  { label: "Jobs & Employment",           domain: "Jobs & Employment",           cls: "economy_btn" },
  { label: "Trade & Commerce",            domain: "Trade & Commerce",            cls: "internationalRelation_btn" },
  { label: "Energy & Environment",        domain: "Energy & Environment",        cls: "energy_btn" },
  { label: "Healthcare & Public Health",  domain: "Healthcare & Public Health",  cls: "healthcare_btn" },
  { label: "Technology & Cybersecurity",  domain: "Technology & Cybersecurity",  cls: "technology_btn" },
];

const LEVEL_COLOR = {
  LOW:      "threat--low",
  ELEVATED: "threat--elevated",
  HIGH:     "threat--high",
  CRITICAL: "threat--critical",
};

const THREAT_CACHE_KEY = "sentinel_threat_cache";
const THREAT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ALL_DOMAINS = DOMAIN_BUTTONS.map((b) => b.domain);

function getCachedThreats() {
  try {
    const raw = sessionStorage.getItem(THREAT_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > THREAT_CACHE_TTL) return null;
    // Invalidate if the cache is missing any current domain
    if (!ALL_DOMAINS.every((d) => d in data)) return null;
    return data;
  } catch { return null; }
}

function cacheThreats(data) {
  try { sessionStorage.setItem(THREAT_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

const Homepage = () => {
  const navigate = useNavigate();
  const [command, setCommand] = useState("");
  const [threatLevels, setThreatLevels] = useState({});
  const [threatLoading, setThreatLoading] = useState(true);

  useEffect(() => {
    // Use cached threats instantly if available — avoids re-calling Claude on every navigation
    const cached = getCachedThreats();
    if (cached) {
      setThreatLevels(cached);
      setThreatLoading(false);
      return;
    }

    fetch("/api/threat")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) throw new Error("Empty response");
        const map = {};
        data.forEach(({ domain, level, reason }) => { map[domain] = { level, reason }; });
        cacheThreats(map);
        setThreatLevels(map);
      })
      .catch((err) => {
        console.warn("Threat fetch failed:", err.message);
      })
      .finally(() => setThreatLoading(false));
  }, []);

  const goToChatbot = (domain) => {
    navigate("/chatbot", { state: { domain, initialQuestion: command.trim() } });
  };

  return (
    <div className="homepage">

      {/* ── Header ── */}
      <header className="topRect">
        <button className="Logout" type="button" onClick={() => navigate("/login")}>
          Logout
        </button>

        <div className="brandRow">
          <img className="homeLogo" src="/president_logo.png" alt="eagle" />
          <div className="brandText">
            <h1 className="heading">SENTINEL</h1>
            <h2 className="subHeading">
              Strategic Executive Network for Threat Evaluation and National Leadership
            </h2>
          </div>
        </div>

        <div className="headerRight">
          <img className="nationLogo" src="/americanFlag.png" alt="america" />
          <div className="securityStatus">
            <img className="lock" src="/lock-icon.png" alt="" />
            <p>SECURED</p>
          </div>
        </div>
      </header>

      {/* ── Main content: 3-column grid ── */}
      <main className="contentArea">

        {/* LEFT — National Priority Alert */}
        <div className="nationalPriority_alt_Container">
          <div className="NPA_topRow">
            <h1 className="NPA_title">National Priority Alert</h1>
            <span className="NPA_badge">HIGH</span>
          </div>
          <div className="NPA_bottomRow">
            <button className="NPA_button" type="button" onClick={() => goToChatbot("National Security")}>
              View Brief
            </button>
          </div>
        </div>

        {/* CENTER — Decision Center */}
        <div className="decision_center">
          <h1 className="DC_title">Decision Center</h1>

          <div className="DC_inputSection">
            <input
              id="Command"
              className="dc_label"
              placeholder="What would you like SENTINEL to analyze?"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
          </div>

          <div className="buttonContainer">
            {DOMAIN_BUTTONS.map(({ label, domain, cls }) => {
              const threat = threatLevels[domain];
              return (
                <button key={domain} className={cls} type="button" onClick={() => goToChatbot(domain)}>
                  <span className="btn-label">{label}</span>
                  {!threatLoading && (
                    <span className={`threat-pill ${threat ? LEVEL_COLOR[threat.level] : "threat--elevated"}`}>
                      ● {threat ? threat.level : "—"}
                    </span>
                  )}
                  {threatLoading && <span className="threat-pill threat--loading">● —</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Daily President Briefing */}
        <div className="presBrief_container">
          <h1 className="PB_title">Daily President Briefing</h1>
          <div className="presBrief_box">
            <span className="checkMark">✔</span>
            <span className="boxText">Ready for Review</span>
          </div>
          <button className="reviewBreif_button" type="button" onClick={() => navigate("/pdb")}>
            Full Presidential Brief
          </button>
        </div>

      </main>
    </div>
  );
};

export default Homepage;
