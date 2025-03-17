import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Import CSS file
import kpmglogo from "../images/kpmg-logo.png";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await axios.post(
                "https://to-do-list-0f6z.onrender.com/auth/auth/login",
                JSON.stringify({ username, password }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            
            localStorage.setItem("token", response.data.access_token);
            alert("Login successful!");
            
            if (isAdmin) {
                navigate("/users");
            } else {
                navigate("/tasks"); // Redirect normal users to tasks
            }
        } catch (error) {
            console.error("Login error:", error.response || error.message);
            alert(error.response?.data?.detail || "Login failed");
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <img className="login-logo" src={kpmglogo} alt="KPMG Logo" />
                <h2 className="login-title">Login</h2>
                <p className="login-subtitle">Sign in to your account</p>
                
                <input
                    type="text"
                    placeholder="Username"
                    className="login-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                
                <input
                    type="password"
                    placeholder="Password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="admin-checkbox">
                    <input
                        type="checkbox"
                        id="admin"
                        checked={isAdmin}
                        onChange={() => setIsAdmin(!isAdmin)}
                    />
                    <label htmlFor="admin">Login as Admin</label>
                </div>
                
                <button
                    className="login-button"
                    onClick={handleLogin}
                >
                    Login
                </button>

                <div className="login-footer">
                    <p>Don't have an account?</p>
                    <button 
                        className="login-signup-button" 
                        onClick={() => navigate("/signup")}
                    >
                        Signup here
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Login;
