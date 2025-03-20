import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import "./Conversations.css";
import kpmglogo from "../images/kpmg-logo.png";
import { FaUser, FaPaperPlane, FaPaperclip, FaSmile } from "react-icons/fa";

// Logout function
const handleLogout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

// Delete account function
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

// Extract username from token
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

// Convert a string to Title Case
function toTitleCase(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const Conversations = () => {
  const currentUser = getUsernameFromToken();
  if (!currentUser) {
    window.location.href = "/login";
  }

  // State for profile dropdown, contacts, chat messages, emoji picker, etc.
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [chat, setChat] = useState([]); // For human chat messages
  const [aiChatHistory, setAiChatHistory] = useState([]); // For AI chat messages
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const ws = useRef(null);
  const chatWindowRef = useRef(null);
  const fileInputRef = useRef(null);

  // 100 emojis array
  const emojis = [
    "😀", "✅", "❤️", "🔥", "👍",
    "🫡", "😤", "👁️", "🫂", "💪",
    "✨", "🎉", "🎊", "🔑", "🔐",
    "🔓", "🔒", "🪪", "💻", "🖥️",
    "🖨️","🔋","🪫","⌨️","🖱️","🖲️",
    "💽","💾","💿","📀","📡","💡",
    "📔","📕","📖","📗","📘","📙",
    "📚","📓","📒","📃","📜","📄","📑",
    "📰","🗞️","🔖","🏷️","💰","🪙","💴",
    "💵","💷","💶","💸","🧾","🏧","✉️",
    "📧","📨","📩","📤","📥","📦","📫",
    "📪","📬","📭","📮","🗳️","✏️","✒️",
    "🖋️","💼","📁","📂","📅","📆","🗓️",
    "📇","📈","📉","📊","📋","📌","⌛",
    "⏳","🔛","🔝","🔜","☑️","🔚","🔙","💲",
    
  ];

  // Fetch users from backend and append the special AI contact ("Llama-AI")
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/auth/auth/all");
        const usersData = response.data.users.filter(
          (user) => user.username.toLowerCase() !== currentUser.toLowerCase()
        );
        // Sort alphabetically and append special AI contact
        usersData.sort((a, b) => a.username.localeCompare(b.username));
        usersData.push({ username: "Llama-AI" });
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, [currentUser]);

  // Establish WebSocket connection (for human chat) or initialize AI chat
  useEffect(() => {
    if (!selectedReceiver) return;

    // When chatting with Llama-AI, skip WebSocket and use HTTP API chat logic
    if (selectedReceiver.toLowerCase() === "llama-ai") {
      if (ws.current) {
        ws.current.close();
        setChat([]);
      }
      if (!conversationId) {
        setConversationId(Date.now().toString());
      }
      return;
    }

    // For human chat, (re)initialize the WebSocket connection
    if (ws.current) {
      ws.current.close();
      setChat([]);
    }
    const wsUrl = `ws://localhost:8000/ws/chat/${currentUser}/${selectedReceiver}`;
    console.log("Connecting to WebSocket at:", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.current.onmessage = (event) => {
      console.log("Received message:", event.data);
      setChat((prev) => [...prev, event.data]);
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
  }, [currentUser, selectedReceiver, conversationId]);

  // Auto-scroll chat window on new messages
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chat, aiChatHistory]);

  // Send plain text message for human chat
  const sendMessage = () => {
    if (ws.current && message.trim() !== "") {
      if (ws.current.readyState === WebSocket.OPEN) {
        console.log("Sending message:", message);
        ws.current.send(message);
        setMessage("");
      } else {
        console.error("WebSocket not open. ReadyState:", ws.current.readyState);
      }
    }
  };

  // For AI chat messages via HTTP POST
  const sendAiMessage = async () => {
    if (message.trim() === "") return;
    setLoadingAi(true);
    // Append user's text message as a JSON string
    setAiChatHistory((prev) => [
      ...prev,
      JSON.stringify({ type: "text", sender: currentUser, text: message }),
    ]);
    try {
      const convId = conversationId || Date.now().toString();
      if (!conversationId) setConversationId(convId);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/todo-ai/",
        {
          message,
          conversation_id: convId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Append AI's reply as a JSON string
      setAiChatHistory((prev) => [
        ...prev,
        JSON.stringify({ type: "text", sender: "Llama-AI", text: response.data.response }),
      ]);
      setMessage("");
    } catch (error) {
      console.error("Error sending AI message:", error);
    } finally {
      setLoadingAi(false);
    }
  };

  // Handle file selection/upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Upload the file using FormData
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      const fileUrl = response.data.url;
      // Create a file message in JSON format
      const fileMessage = JSON.stringify({
        type: "file",
        sender: currentUser,
        filename: file.name,
        fileType: file.type,
        url: fileUrl,
      });
      if (selectedReceiver.toLowerCase() === "llama-ai") {
        setAiChatHistory((prev) => [...prev, fileMessage]);
      } else {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(fileMessage);
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Handle emoji selection: append emoji to current message and hide picker
  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Render message content: if JSON with type "file", show a link (and preview if image/video)
  const renderMessageContent = (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type && parsed.type === "file") {
        return (
          <div className="file-message">
            <a href={parsed.url} target="_blank" rel="noopener noreferrer">
              {parsed.filename}
            </a>
            {parsed.fileType.startsWith("image/") && (
              <img src={parsed.url} alt={parsed.filename} className="chat-image" />
            )}
            {parsed.fileType.startsWith("video/") && (
              <video controls className="chat-video">
                <source src={parsed.url} type={parsed.fileType} />
              </video>
            )}
          </div>
        );
      } else if (parsed.type && parsed.type === "text") {
        return parsed.text;
      } else {
        return msg;
      }
    } catch (e) {
      return msg;
    }
  };

  return (
    <Fragment>
      {/* Header */}
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
              <button className="dropdown-item" onClick={() => (window.location.href = "/tasks")}>
                Tasks
              </button>
              <button className="dropdown-item" onClick={() => (window.location.href = "/todoai")}>
                Llama-Ai
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
        {/* Left Sidebar: Contacts List */}
        <div className="chat-sidebar">
          <h3>Contacts</h3>
          <ul className="contacts-list">
            {users.map((user) => (
              <li
                key={user.username}
                className={`contact-item ${selectedReceiver === user.username ? "active" : ""}`}
                onClick={() => {
                  setSelectedReceiver(user.username);
                  // Clear previous messages when switching contacts
                  setMessage("");
                  setChat([]);
                  setAiChatHistory([]);
                }}
              >
                <div className="contact-avatar">{toTitleCase(user.username).charAt(0)}</div>
                <div className="contact-name">{toTitleCase(user.username)}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Panel: Chat Area */}
        <div className="chat-container">
          {selectedReceiver ? (
            selectedReceiver.toLowerCase() === "llama-ai" ? (
              // Llama-AI (AI) chat panel
              <>
                <div className="chat-header">
                  <h3>{toTitleCase(selectedReceiver)}</h3>
                </div>
                <div className="chat-window" ref={chatWindowRef}>
                  {aiChatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`chat-message ${
                        (() => {
                          try {
                            const parsed = JSON.parse(msg);
                            return parsed.sender.toLowerCase() === currentUser.toLowerCase()
                              ? "sent"
                              : "received";
                          } catch (e) {
                            return msg.startsWith(currentUser) ? "sent" : "received";
                          }
                        })()
                      }`}
                    >
                      <div className="message-dp">
                        {(() => {
                          try {
                            const parsed = JSON.parse(msg);
                            return toTitleCase(parsed.sender).charAt(0);
                          } catch (e) {
                            return toTitleCase(currentUser).charAt(0);
                          }
                        })()}
                      </div>
                      <div className="message-text">{renderMessageContent(msg)}</div>
                    </div>
                  ))}
                  {loadingAi && <div className="chat-message received">AI is typing...</div>}
                </div>
                {/* Emoji Picker appears on top */}
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {emojis.map((emoji, index) => (
                      <span key={index} className="emoji" onClick={() => handleEmojiSelect(emoji)}>
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}
                <div className="chat-input-area">
                  <button onClick={handleFileUpload}>
                    <FaPaperclip />
                  </button>
                  <button onClick={toggleEmojiPicker}>
                    <FaSmile />
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
                      if (e.key === "Enter") {
                        sendAiMessage();
                      }
                    }}
                  />
                  <button onClick={sendAiMessage}>
                    <FaPaperPlane />
                  </button>
                </div>
              </>
            ) : (
              // Human chat panel using WebSocket
              <>
                <div className="chat-header">
                    <span className="selected-receiver-avatar">{toTitleCase(selectedReceiver).charAt(0)}</span>
                    <span className="selected-receiver-heading">{toTitleCase(selectedReceiver)}</span>
                </div>
                <div className="chat-window" ref={chatWindowRef}>
                  {chat.map((msg, index) => {
                    let isFileMessage = false;
                    let senderName = "";
                    let content = msg;
                    try {
                      const parsed = JSON.parse(msg);
                      if (parsed.type === "file") {
                        isFileMessage = true;
                      }
                      senderName = parsed.sender || "";
                    } catch (e) {
                      const colonIndex = msg.indexOf(": ");
                      if (colonIndex !== -1) {
                        senderName = msg.substring(0, colonIndex);
                        content = msg.substring(colonIndex + 2);
                      }
                    }
                    const messageType =
                      senderName.toLowerCase() === currentUser.toLowerCase() ? "sent" : "received";
                    return (
                      <div key={index} className={`chat-message ${messageType}`}>
                        <div className="message-dp">
                          {toTitleCase(senderName ? senderName : currentUser).charAt(0)}
                        </div>
                        <div className="message-text">
                          {isFileMessage ? renderMessageContent(msg) : content}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {emojis.map((emoji, index) => (
                      <span key={index} className="emoji" onClick={() => handleEmojiSelect(emoji)}>
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}
                <div className="chat-input-area">
                  <button onClick={handleFileUpload}>
                    <FaPaperclip />
                  </button>
                  <button onClick={toggleEmojiPicker}>
                    <FaSmile />
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
                      if (e.key === "Enter") {
                        sendMessage();
                      }
                    }}
                  />
                  <button onClick={sendMessage}>
                    <FaPaperPlane />
                  </button>
                </div>
              </>
            )
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
