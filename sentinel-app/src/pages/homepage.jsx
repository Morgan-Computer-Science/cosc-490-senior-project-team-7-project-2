import "./homepage.css";

const Homepage = () => {
  return (
    <div className="homepage">
      <header className="topRect">
        <button className="Logout" type="button">
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
        <img className="nationLogo" src="/americanFlag.png" alt="america" />
        <div className="securityStatus">
          <img className="lock" src="/lock-icon.png" alt="" />
          <p>SECURED</p>
        </div>
      </header>


      <div className="presBrief_container">
        <h1 className="PB_title">Daily President Briefing</h1>

        <div className="presBrief_box">
            <span className="checkMark">✔</span>
            <span className="boxText">Ready for Review</span>
        </div>
        <button className="reviewBreif_button" type="button">Review Now</button>
      </div>


      <div className="decision_center">
        <h1 className="DC_title">Decision Center</h1>

        <div className="DC_inputSection">

          <input
            id="Command"
            className="dc_label"
            placeholder="What would you like SENTINEL to analyze?"
          />

        </div>

        <div className="buttonContainer">

          <button className="domesticPolicy_btn" type="button">Domestic Policy</button>

          <button className="economy_btn" type="button">Economy</button>

          <button className="nationalSecurity_btn" type="button">National Security</button>

          <button className="internationalRelation_btn" type="button">International Relation</button>

          
        </div>
      </div>

      <div className="nationalPriority_alt_Container">

        <div className="NPA_topRow">
          <h1 className="NPA_title">National Priority Alert</h1>
          <span className="NPA_badge">HIGH</span>
        </div>


        <div className="NPA_bottomRow">
          <button className="NPA_button" type="button">View Brief</button>
        </div>
      </div>
    </div>
  );
};

export default Homepage;