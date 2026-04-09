import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./homepage.css";

const Homepage = () => {
  const navigate = useNavigate();
  const [command, setCommand] = useState("");

  const goToChatbot = (domain) => {
    navigate("/chatbot", { state: { domain, initialQuestion: command.trim() } });
  };

  const handleReviewNow = () => {
    navigate("/chatbot", { state: { domain: "National Security", initialQuestion: "Generate the full daily presidential briefing." } });
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
            <button className="domesticPolicy_btn" type="button" onClick={() => goToChatbot("Domestic Policy")}>
              Domestic Policy
            </button>
            <button className="economy_btn" type="button" onClick={() => goToChatbot("Economy")}>
              Economy
            </button>
            <button className="nationalSecurity_btn" type="button" onClick={() => goToChatbot("National Security")}>
              National Security
            </button>
            <button className="internationalRelation_btn" type="button" onClick={() => goToChatbot("International Relations")}>
              International Relations
            </button>
          </div>
        </div>

        {/* RIGHT — Daily President Briefing */}
        <div className="presBrief_container">
          <h1 className="PB_title">Daily President Briefing</h1>
          <div className="presBrief_box">
            <span className="checkMark">✔</span>
            <span className="boxText">Ready for Review</span>
          </div>
          <button className="reviewBreif_button" type="button" onClick={handleReviewNow}>
            Review Now
          </button>
        </div>

      </main>
    </div>
  );
};

export default Homepage;
