import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./homepage.css";

const DOMAIN_BUTTONS = [
  { label: "Domestic Policy",        domain: "Domestic Policy",        cls: "domesticPolicy_btn" },
  { label: "Economy",                domain: "Economy",                cls: "economy_btn" },
  { label: "National Security",      domain: "National Security",      cls: "nationalSecurity_btn" },
  { label: "International Relations",domain: "International Relations",cls: "internationalRelation_btn" },
  { label: "Military & Defense",     domain: "Military & Defense",     cls: "domesticPolicy_btn" },
  { label: "Jobs & Employment",      domain: "Jobs & Employment",      cls: "economy_btn" },
  { label: "Trade & Commerce",       domain: "Trade & Commerce",       cls: "nationalSecurity_btn" },
];

const LEVEL_COLOR = {
  LOW:      "threat--low",
  ELEVATED: "threat--elevated",
  HIGH:     "threat--high",
  CRITICAL: "threat--critical",
};

const Homepage = () => {
  const navigate = useNavigate();
  const [command, setCommand] = useState("");
  const [threatLevels, setThreatLevels] = useState({});
  const [threatLoading, setThreatLoading] = useState(true);

  useEffect(() => {
    fetch("/api/threat")
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        data.forEach(({ domain, level, reason }) => { map[domain] = { level, reason }; });
        setThreatLevels(map);
      })
      .catch(() => {})
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
