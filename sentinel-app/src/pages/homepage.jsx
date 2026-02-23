import "./homepage.css";

const Homepage = () => {
  return (
    <div className="homepage">
      <header className="topRect">
        <button className="Logout" type="button">
          Logout
        </button>

        <div className="brandRow">
          <img className="homeLogo" src="/president_logo.png" alt="Seal" />

          <div className="brandText">
            <h1 className="heading">SENTINEL</h1>
            <h2 className="subHeading">
              Strategic Executive Network for Threat Evaluation and National Leadership
            </h2>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Homepage;