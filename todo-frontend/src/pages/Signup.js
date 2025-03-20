import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Signup.css";
import kpmglogo from "../images/kpmg-logo.png";

function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [captchaQuestion, setCaptchaQuestion] = useState("");
    const [captchaAnswer, setCaptchaAnswer] = useState("");
    const [userCaptchaInput, setUserCaptchaInput] = useState("");
    const navigate = useNavigate();

    // Generate a simple math captcha
    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        setCaptchaQuestion(`${num1} + ${num2} = ?`);
        setCaptchaAnswer(num1 + num2);
    };

    // Generate a captcha when the component loads
    useState(() => {
        generateCaptcha();
    }, []);

    const handleSignup = async () => {
        if (!name || !email || !username || !password) {
            alert("All fields are required!");
            return;
        }

        if (parseInt(userCaptchaInput) !== captchaAnswer) {
            alert("Incorrect CAPTCHA. Please try again.");
            generateCaptcha();
            return;
        }

        try {
            const response = await axios.post("http://127.0.0.1:8000/auth/auth/signup", {
                name,
                email,
                username,
                password,
            });

            alert(response.data.message);
            navigate("/login");
        } catch (error) {
            alert(error.response?.data?.detail || "Signup failed");
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-box">
                <img className="signup-logo" src={kpmglogo} alt="KPMG Logo" />
                <h2 className="signup-title">Create an Account</h2>
                <p className="signup-subtitle">Sign up to get started</p>

                <input
                    type="text"
                    placeholder="Full Name"
                    className="signup-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    type="email"
                    placeholder="Email Address"
                    className="signup-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="text"
                    placeholder="Username"
                    className="signup-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="signup-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="captcha-container">
                    <h2 className="captcha-question">{captchaQuestion}</h2>
                    <input
                        type="text"
                        placeholder="Enter CAPTCHA"
                        className="signup-input"
                        value={userCaptchaInput}
                        onChange={(e) => setUserCaptchaInput(e.target.value)}
                    />
                </div>

                <button className="signup-button" onClick={handleSignup}>
                    Signup
                </button>

                <div className="signup-footer">
                    <p>Already have an account?</p>
                    <button 
                        className="signup-login-button" 
                        onClick={() => navigate("/login")}
                    >
                        Login here
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Signup;
