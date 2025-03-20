import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import "./ToDoAi.css";
import kpmglogo from "../images/kpmg-logo.png";
import { FaUser, FaPaperPlane } from "react-icons/fa";

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

function toTitleCase(str) {
if (!str) return "";
return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

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

const App = () => {
const currentUser = getUsernameFromToken();
if (!currentUser) {
window.location.href = "/login";
}

const [message, setMessage] = useState("");
const [chatHistory, setChatHistory] = useState([]);
const [isChatActive, setIsChatActive] = useState(true);
const [loading, setLoading] = useState(false);
const [conversationId, setConversationId] = useState(null);
const [showProfileDropdown, setShowProfileDropdown] = useState(false);

const chatContainerRef = useRef(null);

useEffect(() => {
if (chatContainerRef.current) {
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
}
}, [chatHistory]);

// Initialize conversationId and fetch previous chat history.
useEffect(() => {
if (!conversationId) {
    const newId = Date.now().toString();
    setConversationId(newId);
} else {
    fetchChatHistory(conversationId);
}
}, [conversationId]);

const fetchChatHistory = async (convId) => {
try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
    `http://localhost:8000/api/todo-ai/chats?conversation_id=${convId}`,
    {
        headers: { Authorization: `Bearer ${token}` },
    }
    );
    if (response.data && response.data.messages) {
    setChatHistory(response.data.messages);
    }
} catch (error) {
    console.error("Failed to fetch chat history", error);
}
};

const sendMessage = async (event) => {
event.preventDefault();
if (message.trim() === "") return;
setLoading(true);
// Append the user's message to chat history.
setChatHistory((prevHistory) => [
    ...prevHistory,
    { role: "user", content: message },
]);

try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://localhost:8000/api/todo-ai/`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
        message,
        conversation_id: conversationId,
    }),
    });

    if (!response.ok) {
    throw new Error("Error with API request");
    }

    const data = await response.json();
    // Append the AI's response to chat history.
    setChatHistory((prevHistory) => [
    ...prevHistory,
    { role: "assistant", content: data.response },
    ]);
    setMessage("");
} catch (error) {
    console.error("Error:", error);
} finally {
    setLoading(false);
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
            <button
            className="dropdown-item"
            onClick={() => (window.location.href = "/conversations")}
            >
            Conversations
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
    <div className="chat-wrapper">
    <div className="chat-box">
        <div className="chat-header-box">
        <h1 className="chat-title">Llama-Ai - Chatbot</h1>
        </div>
        <div className="chat-history" ref={chatContainerRef}>
        {chatHistory.map((msg, index) => (
            <div
            key={index}
            className={`chat-bubble ${
                msg.role === "user" ? "bubble-user" : "bubble-ai"
            }`}
            >
            {msg.content}
            </div>
        ))}
        {loading && (
            <div className="chat-bubble bubble-ai loading">
            AI is typing...
            </div>
        )}
        </div>
        {isChatActive && (
        <form onSubmit={sendMessage} className="chat-input-form">
            <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="chat-input"
            placeholder="Type your message..."
            />
            <button
            type="submit"
            className="chat-send-btn"
            disabled={loading || !message.trim()}
            >
            <FaPaperPlane />
            </button>
        </form>
        )}
    </div>
    </div>
</Fragment>
);
};

export default App;
