"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Connect ke socket
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("chat-app-token") },
    });

    socketRef.current.on("connect", () => console.log("✅ Connected to socket server"));

    socketRef.current.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    socketRef.current.emit("getMessages");
    socketRef.current.on("initialMessages", (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => socketRef.current.disconnect();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = () => {
    if (!newMsg.trim()) return;
    const msg = { text: newMsg, userId: user.id, id: Date.now(), username: user.name };
    socketRef.current.emit("sendMessage", msg);
    setNewMsg("");
  };

  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = (id) => {
    socketRef.current.emit("editMessage", { id, text: editText });
    setMessages(messages.map((msg) => (msg.id === id ? { ...msg, text: editText } : msg)));
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (id) => {
    socketRef.current.emit("deleteMessage", id);
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className={`${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"} flex flex-col h-screen`}>
      
      {/* Header */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-blue-600"} flex justify-between items-center p-4 shadow`}>
        <h1 className="text-xl font-bold">Chat Room</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDarkMode}
            className={`${darkMode ? "bg-yellow-400" : "bg-gray-200"} px-3 py-1 rounded`}
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={logout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.userId === user.id;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`relative max-w-lg p-3 rounded-lg ${isOwn ? "bg-blue-500 text-white" : darkMode ? "bg-gray-700 text-gray-100" : "bg-gray-200 text-gray-900"}`}>
                {/* Username for other users */}
                {!isOwn && <div className="text-xs font-semibold mb-1">{msg.username}</div>}

                {/* Message text */}
                {editingId === msg.id ? (
                  <div className="flex space-x-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 p-1 rounded border"
                    />
                    <button onClick={() => saveEdit(msg.id)} className="bg-green-500 px-2 rounded text-white">Save</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-400 px-2 rounded text-white">Cancel</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span>{msg.text}</span>
                    {isOwn && (
                      <div className="flex space-x-1 ml-2 text-sm">
                        <button onClick={() => handleEdit(msg)} className="text-yellow-200 hover:text-yellow-400">Edit</button>
                        <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:text-red-600">Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input */}
      <div className="flex p-4 space-x-2 border-t border-gray-300">
        <input
          type="text"
          placeholder="Tulis pesan..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-2 border rounded-lg"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}
