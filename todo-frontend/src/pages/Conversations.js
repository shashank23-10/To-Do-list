import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import "./Conversations.css";
import kpmglogo from "../images/kpmg-logo.png";
import { FaUser } from "react-icons/fa";

const handleLogout = () => {
localStorage.removeItem("token");
window.location.href = "/login";
};

const handleDeleteAccount = async () => {
if (window.confirm("Are you sure you want to delete your account?")) {
try {
    const token = localStorage.getItem("token");
    await axios.delete("http://127.0.0.1:8000/auth/auth/delete", {
    headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem("token");
    window.location.href = "/signup";
} catch (error) {
    alert("Failed to delete account");
}
}
};

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

function toTitleCase(str) {
if (!str) return "";
return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const Conversations = () => {
const currentUser = getUsernameFromToken();
if (!currentUser) {
window.location.href = "/login";
}

const [showProfileDropdown, setShowProfileDropdown] = useState(false);
const [users, setUsers] = useState([]);
const [selectedReceiver, setSelectedReceiver] = useState(null);
const [chat, setChat] = useState([]);
const [message, setMessage] = useState("");
const ws = useRef(null);

useEffect(() => {
const fetchUsers = async () => {
    try {
    const response = await axios.get("http://127.0.0.1:8000/auth/auth/all");
    const usersData = response.data.users.filter(
        (user) =>
        user.username.toLowerCase() !== currentUser.toLowerCase()
    );
    setUsers(usersData);
    } catch (error) {
    console.error("Error fetching users:", error);
    }
};
fetchUsers();
}, [currentUser]);

useEffect(() => {
if (ws.current) {
    ws.current.close();
    setChat([]);
}
if (!selectedReceiver) return;
const wsUrl = `ws://localhost:8000/ws/chat/${currentUser}/${selectedReceiver}`;
console.log("Connecting to WebSocket at:", wsUrl);
ws.current = new WebSocket(wsUrl);

ws.current.onopen = () => {
    console.log("WebSocket connected");
};

ws.current.onmessage = (event) => {
    console.log("Received message:", event.data);
    setChat((prevChat) => [...prevChat, event.data]);
};

ws.current.onerror = (error) => {
    console.error("WebSocket error:", error);
};

ws.current.onclose = () => {
    console.log("WebSocket disconnected");
};

return () => {
    if (ws.current) ws.current.close();
};
}, [currentUser, selectedReceiver]);

const sendMessage = () => {
if (ws.current) {
    if (ws.current.readyState === WebSocket.OPEN && message.trim() !== "") {
    console.log("Sending message:", message);
    ws.current.send(message);
    setMessage("");
    } else {
    console.error("WebSocket not open. ReadyState:", ws.current.readyState);
    }
} else {
    console.error("WebSocket not initialized");
}
};

return (
<Fragment>
    <header className="header">
    <img className="logo" src={kpmglogo} alt="KPMG Logo" />
    <div className="profile-menu">
        <button
        className="profile-button"
        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        >
        <FaUser /> {toTitleCase(currentUser)}
        </button>
        {showProfileDropdown && (
        <div className="profile-dropdown">
            <button
            className="dropdown-item"
            onClick={() => (window.location.href = "/tasks")}
            >
            Tasks
            </button>
            <button className="dropdown-item" onClick={handleLogout}>
            Logout
            </button>
            <button className="dropdown-item" onClick={handleDeleteAccount}>
            Delete Account
            </button>
        </div>
        )}
    </div>
    </header>

    <div className="chat-page">
    <div className="chat-sidebar">
        <h3>Contacts</h3>
        <ul className="contacts-list">
        {users.map((user) => (
            <li
            key={user.username}
            className={`contact-item ${
                selectedReceiver === user.username ? "active" : ""
            }`}
            onClick={() => setSelectedReceiver(user.username)}
            >
            <div className="contact-avatar">
                {toTitleCase(user.username).charAt(0)}
            </div>
            <div className="contact-name">
                {toTitleCase(user.username)}
            </div>
            </li>
        ))}
        </ul>
    </div>

    <div className="chat-container">
        {selectedReceiver ? (
        <>
            <div className="chat-header">
            <h3>{toTitleCase(selectedReceiver)}</h3>
            </div>
            <div className="chat-window">
            {chat.map((msg, index) => {
                const colonIndex = msg.indexOf(": ");
                const text = colonIndex !== -1 ? msg.substring(colonIndex + 2) : msg;
                const messageType = msg.startsWith(currentUser)
                ? "sent"
                : "received";
                return (
                <div key={index} className={`chat-message ${messageType}`}>
                    {text}
                </div>
                );
            })}
            </div>
            <div className="chat-input-area">
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
                onKeyPress={(e) => {
                if (e.key === "Enter") {
                    sendMessage();
                }
                }}
            />
            <button onClick={sendMessage}>Send</button>
            </div>
        </>
        ) : (
        <div className="no-chat-selected">
            <p>Select a contact to start chatting</p>
        </div>
        )}
    </div>
    </div>
</Fragment>
);
};

export default Conversations;
