import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import axios from "axios";
import "./Users.css"; // Import CSS file
import kpmglogo from "../images/kpmg-logo.png";

function getUsernameFromToken() {
const token = localStorage.getItem("token");
if (!token) return null;
try {
const payload = JSON.parse(atob(token.split(".")[1]));
return payload.sub;
} catch (err) {
console.error("Failed to decode token", err);
return null;
}
}

function Login() {
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [isAdmin, setIsAdmin] = useState(false);
const [users, setUsers] = useState([]);
const [loggedIn, setLoggedIn] = useState(false);
const navigate = useNavigate(); // Initialize useNavigate

const handleLogin = async () => {
try {
    // Hardcoded username and password 
    if (username === "shashank" && password === "admin") {
    localStorage.setItem("role", "admin");
    alert("Admin login successful!");
    setIsAdmin(true);
    setLoggedIn(true);
    fetchUsers();
    return;
    }

    const response = await axios.post(
    "http:/https://to-do-list-0f6z.onrender.com/auth/auth/login",
    JSON.stringify({ username, password }),
    {
        headers: {
        "Content-Type": "application/json",
        },
    }
    );

    localStorage.setItem("token", response.data.access_token);
    alert("Login successful!");
    setLoggedIn(true);
    fetchUsers();
} catch (error) {
    console.error("Login error:", error.response || error.message);
    alert(error.response?.data?.detail || "Login failed");
}
};

const fetchUsers = async () => {
try {
    const token = localStorage.getItem("token");
    // Adjust the URL if needed so that it returns all users
    const response = await axios.get("http://127.0.0.1:8000/auth/auth/all", {
    headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Fetched users:", response.data);
    
    // Check if the returned data is an array or has a "users" field
    if (Array.isArray(response.data)) {
    setUsers(response.data);
    } else if (response.data.users) {
    setUsers(response.data.users);
    } else {
    console.error("Unexpected users response structure:", response.data);
    setUsers([]);
    }
} catch (error) {
    console.error("Failed to fetch users:", error.response || error.message);
    alert("Failed to fetch users");
}
};

const handleLogout = () => {
localStorage.removeItem("token");
setLoggedIn(false);
setUsers([]);
navigate("/login"); // Navigate to login page
};

return (
<div className="login-container">
    <div className="login-box">
    <img className="login-logo" src={kpmglogo} alt="KPMG Logo" />
    {!loggedIn && (
        <>
        <h2 className="login-title">Login</h2>
        <p className="login-subtitle">Sign in to your account</p>
        </>
    )}

    {!loggedIn ? (
        <>
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

        <button className="login-button" onClick={handleLogin}>
            Login
        </button>
        </>
    ) : (
        <div>
        <h2 className="login-title">Users List</h2>
        <ul>
            {users.map((user, index) => (
            <li key={index} className="border-b p-2">
                {user.username}
            </li>
            ))}
        </ul>
        <button className="login-button" onClick={handleLogout}>
            Logout
        </button>
        </div>
    )}
    </div>
</div>
);
}

export default Login;
