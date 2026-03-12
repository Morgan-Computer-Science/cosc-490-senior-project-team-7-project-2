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

          <button className="domesticPolicy_btn">Domestic Policy</button>
          <button className="economy_btn">Economy</button>
          <button className="nationalSecurity_btn">National Security</button>
          <button className="internationalRelation_btn">International Relation</button>
          
        </div>

        




      </div>
    </div>
  );
};

export default Homepage;