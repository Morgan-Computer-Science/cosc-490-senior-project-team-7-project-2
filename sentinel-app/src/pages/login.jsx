import "./login.css";

const Login = () =>
    {
        return (
            <div className="page">
                <div className="container">
                    <h1 className="heading">SENTINEL</h1>
                    <h2 className="subHeading">Strategic Executive Network for Threat Evaluation and National Leadership</h2>
                    <img className="logo" src="/president_logo.png" alt="President Logo"/>

                    {/* Username Section */}
                    <label className="label" htmlFor="username">President :</label>
                        <input
                            className="input"
                                id="username"
                                    type="text"
                                    placeholder="Enter Codename"
                        />

                    {/* Password Section */}
                    <label className="label02" htmlFor="password">Password :</label>
                    <input
                        className="input02"
                            id="password"
                                type="text"
                                placeholder="Enter Password"
                    />


                    {/* Login button */}

                    <button className='loginButton' type='button'>Sign In </button>


                    <div class="footer"></div>
                    <div class="footer2"></div>

                </div>
            </div>
        );
        
    };

    export default Login;