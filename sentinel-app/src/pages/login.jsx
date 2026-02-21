import "./login.css";

const Login = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // later you can route to /chatbot here
    alert("Submitted");
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="heading">SENTINEL</h1>
        <h2 className="subHeading">
          Strategic Executive Network for Threat Evaluation and National Leadership
        </h2>

        <img className="logo" src="/president_logo.png" alt="President Logo" />

        <form onSubmit={handleSubmit}>
          {/* Username Section */}
          <label className="label" htmlFor="username">
            President :
          </label>
          <input
            className="input"
            id="username"
            type="text"
            placeholder="Enter Codename"
            required
          />

          {/* Password Section */}
          <label className="label02" htmlFor="password">
            Password :
          </label>
          <input
            className="input02"
            id="password"
            type="password"
            placeholder="Enter Password"
            required
          />

          {/* Login button */}
          <button className="loginButton" type="submit">
            Sign In
          </button>
        </form>

        {/* These were class=, must be className= */}
        <div className="footer"></div>
        <div className="footer2"></div>
      </div>
    </div>
  );
};

export default Login;