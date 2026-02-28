import "./login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Demo Credentials
  const DEMO_PRES = "POTUS";
  const DEMO_PASS = "sentinel1123";

  const handleSubmit = (e) => {
    e.preventDefault();

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError("Username and Password are required.");
      return;
    }

    if (u === DEMO_PRES && p === DEMO_PASS) {
      setError("");
      navigate("/chatbot");
      return;
    }

    setError("Invalid codename or password.");
  };

  return (
    <div className="page">
      <img className="backgroundImg" src="/situation_room.png" alt="" />

      <div className="container">
        <h1 className="heading_login">SENTINEL</h1>
        <h2 className="subHeading_login">
          Strategic Executive Network for Threat Evaluation and National Leadership
        </h2>

        <img className="logo" src="/president_logo.png" alt="" />

        <form onSubmit={handleSubmit}>
          <label className="label" htmlFor="username">President :</label>
          <input
            className="input"
            id="username"
            type="text"
            placeholder="Enter Codename"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError("");
            }}
            required
          />

          <label className="label02" htmlFor="password">Password :</label>
          <input
            className="input02"
            id="password"
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            required
          />

          {error && <p className="errorText">{error}</p>}

          <button className="loginButton" type="submit">Sign In</button>
        </form>

        <div className="footer">
          © {new Date().getFullYear()} United States Government. Prototype system for academic demonstration purposes only.
        </div>
        <div className="footer2">
          Powered by Group 7: Amyra Harry, Elijah Ballou, Daniel Onyejiekwe, Jaden Reeves
        </div>
      </div>
    </div>
  );
};

export default Login;