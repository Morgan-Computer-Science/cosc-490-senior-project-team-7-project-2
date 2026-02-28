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
          <img className="lock"src="lock-icon.png"alt=""/>
          <p>SECURED</p>
        </div>
      </header>

      <div className="presBrief_container">
        <h1 className="PB_title"> Daily President Briefing </h1>


      </div>
    </div>
  );
};

export default Homepage;