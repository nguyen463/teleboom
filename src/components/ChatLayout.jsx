"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 🔹 Connect ke Socket.IO
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("chat-app-token") },
    });

    socketRef.current.on("connect", () => console.log("✅ Connected to socket server"));

    // 🔹 Terima pesan dari server
    socketRef.current.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    // 🔹 Terima edit & delete
    socketRef.current.on("editMessage", ({ id, text }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, text } : msg))
      );
    });
    socketRef.current.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    // 🔹 Terima user online
    socketRef.current.on("onlineUsers", (users) => setOnlineUsers(users));

    // 🔹 Typing indicator
    socketRef.current.on("typing", (users) => setTypingUsers(users));

    // 🔹 Load awal messages
    socketRef.current.emit("getMessages");
    socketRef.current.on("initialMessages", (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => socketRef.current.disconnect();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // 🔹 Kirim pesan
  const sendMessage = () => {
    if (!newMsg.trim()) return;
    const msg = { text: newMsg, userId: user.id, username: user.name, id: Date.now() };
    socketRef.current.emit("sendMessage", msg);
    setNewMsg("");
  };

  // 🔹 Edit pesan
  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };
  const saveEdit = (id) => {
    socketRef.current.emit("editMessage", { id, text: editText });
    setEditingId(null);
    setEditText("");
  };

  // 🔹 Delete pesan
  const handleDelete = (id) => {
    socketRef.current.emit("deleteMessage", id);
  };

  // 🔹 Typing indicator
  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (e.target.value) socketRef.current.emit("typing", user.name);
    else socketRef.current.emit("stopTyping", user.name);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar online users */}
      <div className="w-64 bg-gray-100 p-4 border-r">
        <h2 className="text-lg font-bold mb-4">Online Users</h2>
        <ul>
          {onlineUsers.map((u) => (
            <li key={u} className={`mb-2 ${u === user.id ? "font-bold text-blue-600" : ""}`}>
              {u} {typingUsers.includes(u) && <span className="text-sm text-green-500">typing...</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Chat main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow">
          <h1 className="text-xl font-bold">Chat Room</h1>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">
            Logout
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {messages.map((msg) => {
            const isOwn = msg.userId === user.id;
            return (
              <div
                key={msg.id}
                className={`max-w-lg p-2 rounded-lg ${isOwn ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-gray-900"}`}
              >
                {editingId === msg.id ? (
                  <div className="flex space-x-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 p-1 rounded border"
                    />
                    <button onClick={() => saveEdit(msg.id)} className="bg-green-500 px-2 rounded text-white">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-400 px-2 rounded text-white">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span>{msg.username}: {msg.text}</span>
                    {isOwn && (
                      <div className="flex space-x-1 ml-2 text-sm">
                        <button onClick={() => handleEdit(msg)} className="text-yellow-200 hover:text-yellow-400">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:text-red-600">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 p-2 border rounded-lg"
          />
          <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
