// toddler-frontend/src/components/DocumentChat.jsx
import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./DocChat.css"; // reusing the same CSS so your styling remains consistent
import kpmglogo from "../images/kpmg-logo.png";
import { FaUser, FaPaperPlane, FaPaperclip } from "react-icons/fa";

// Helper: extract username from JWT token
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

// Helper: convert string to Title Case
function toTitleCase(str) {
if (!str) return "";
return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const DocumentChat = () => {
const token = localStorage.getItem("token");
const currentUser = getUsernameFromToken();
if (!currentUser) window.location.href = "/login";

// State for profile dropdown
const [showProfileDropdown, setShowProfileDropdown] = useState(false);
// Document state: holds the uploaded document info
const [uploadedDoc, setUploadedDoc] = useState(null);
// Chat conversation history for this document
const [docChatHistory, setDocChatHistory] = useState([]);
// Input state for sending chat messages
const [message, setMessage] = useState("");
// File state (for uploading a document or attachments)
const [file, setFile] = useState(null);

// Refs for auto-scrolling chat window and file input click
const chatWindowRef = useRef(null);
const fileInputRef = useRef(null);

// Auto-scroll the chat window when new messages are added
useEffect(() => {
if (chatWindowRef.current) {
    chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
}
}, [docChatHistory]);

// Handle file selection for document upload
const handleFileChange = (e) => {
setFile(e.target.files[0]);
};

// Upload a document and create a new document chat conversation
const handleUpload = async () => {
if (!file) return;
const reader = new FileReader();
reader.onload = async (e) => {
    const text = e.target.result;
    // Build the document object
    const doc = {
    doc_id: file.name, // using file name as doc_id; update as needed
    title: file.name,
    content: text,
    };
    try {
    const res = await axios.post(
        "https://to-do-list-0f6z.onrender.com/docchat/upload_document",
        doc,
        {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        }
    );
    // Simulate a summary (first 200 characters) and store document details
    setUploadedDoc({
        id: res.data.doc_id,
        title: file.name,
        summary: text.substring(0, 500) + "...",
    });
    // Clear any previous chat history
    setDocChatHistory([]);
    } catch (error) {
    console.error("Upload error:", error);
    }
};
reader.readAsText(file);
};

// Trigger hidden file input click (for attachment in chat if needed)
const handleFileUploadClick = () => {
if (fileInputRef.current) fileInputRef.current.click();
};

// Send a chat message regarding the document
const sendMessage = async () => {
if (!uploadedDoc || message.trim() === "") return;
const conversation_id = uploadedDoc.id + "-conversation";
// Append user's message to conversation history
const userMessage = { role: "user", content: message };
setDocChatHistory((prev) => [...prev, userMessage]);
try {
    const res = await axios.post(
    "https://to-do-list-0f6z.onrender.com/docchat/doc_chat",
    {
        doc_id: uploadedDoc.id,
        conversation_id: conversation_id,
        message: message,
    },
    {
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        },
    }
    );
    // Append assistant's reply to conversation history
    const assistantMessage = { role: "assistant", content: res.data.response };
    setDocChatHistory((prev) => [...prev, assistantMessage]);
    setMessage("");
} catch (error) {
    console.error("Chat error:", error);
}
};

// Logout and Delete Account functions
const handleLogout = () => {
localStorage.removeItem("token");
window.location.href = "/login";
};

const handleDeleteAccount = async () => {
if (window.confirm("Are you sure you want to delete your account?")) {
    try {
    await axios.delete("https://to-do-list-0f6z.onrender.com/auth/auth/delete", {
        headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem("token");
    window.location.href = "/signup";
    } catch (error) {
    alert("Failed to delete account");
    }
}
};

return (
<Fragment>
    <header className="header">
    <img className="logo" src={kpmglogo} alt="KPMG Logo" />
    <a href="/tasks">Tasks</a>
    <a href="/conversations">Conversations</a>
    <a href="/docchat">Chat with Document</a>
    <div className="profile-menu">
        <button
        className="profile-button"
        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        >
        <FaUser /> {toTitleCase(currentUser)}
        </button>
        {showProfileDropdown && (
        <div className="profile-dropdown">
            <button className="dropdown-item" onClick={() => (window.location.href = "/tasks")}>
            Tasks
            </button>
            <button className="dropdown-item" onClick={() => (window.location.href = "/docchat")}>
            Chat with Document
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
    <div className="doc_chat_chat-page">
    {/* Left Sidebar: Document Info or Upload */}
    <div className="doc_chat_doc-sidebar">
        {uploadedDoc ? (
        <div className="doc_chat_document-info">
            <div className="doc_chat_doc-avatar">{uploadedDoc.title.charAt(0)}</div>
            <div className="doc_chat_doc-details">
                <h3>{uploadedDoc.title}</h3>
                <p style={{color: "#fff"}}>{uploadedDoc.summary}</p>
            </div>
            <button
            onClick={() => {
                // Allow re-uploading a document by resetting state
                setUploadedDoc(null);
                setFile(null);
                setDocChatHistory([]);
            }}
            >
            Change Document
            </button>
        </div>
        ) : (
        <div className="doc_chat_upload-container">
            <h1 style={{color: "#fff"}}>Upload a Document</h1>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload & Summarize</button>
        </div>
        )}
    </div>
    {/* Right Panel: Document Chat Area */}
    <div className="doc_chat_chat-container">
        {uploadedDoc ? (
        <>
            <div className="doc_chat_chat-header">
            <span className="doc_chat_selected-receiver-avatar">{uploadedDoc.title.charAt(0)}</span>
            <span className="doc_chat_selected-receiver-heading">{uploadedDoc.title}</span>
            </div>
            <div className="doc_chat_chat-window" ref={chatWindowRef}>
            {docChatHistory.length === 0 && (
                <p className="chat-placeholder">Your conversation will appear here...</p>
            )}
            {docChatHistory.map((msg, index) => (
                <div
                key={index}
                className={`doc_chat_chat-message ${msg.role === "user" ? "sent" : "received"}`}
                >
                <div className="doc_chat_message-dp">
                    {msg.role === "user" ? toTitleCase(currentUser).charAt(0) : "A"}
                </div>
                <div className="doc_chat_message-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                </div>
            ))}
            </div>
            <div className="doc_chat_chat-input-area">
                <button onClick={handleFileUploadClick}>
                    <FaPaperclip />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    onKeyPress={(e) => {
                    if (e.key === "Enter") sendMessage();
                    }}
                />
                <button onClick={sendMessage}>
                    <FaPaperPlane />
                </button>
            </div>
        </>
        ) : (
        <div className="doc_chat_no-chat-selected">
            <p>Please upload a document to start chatting.</p>
        </div>
        )}
    </div>
    </div>
</Fragment>
);
};

export default DocumentChat;
