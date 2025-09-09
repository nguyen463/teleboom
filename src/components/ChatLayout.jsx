"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth"; // <- @ mengacu ke src/

export default function ChatLayout({ user }) {
  return (
    <div>
      <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">
        Logout
      </button>
    </div>
  );
}
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // 🔹 Connect to Socket.IO
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("chat-app-token") },
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Connected to socket server");
    });

    socketRef.current.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    // Load initial messages (optional, from backend)
    socketRef.current.emit("getMessages");

    socketRef.current.on("initialMessages", (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // 🔹 Scroll ke bawah otomatis
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 🔹 Kirim pesan baru
  const sendMessage = () => {
    if (!newMsg.trim()) return;
    const msg = { text: newMsg, userId: user.id, id: Date.now() };
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
    setMessages(messages.map((msg) => (msg.id === id ? { ...msg, text: editText } : msg)));
    setEditingId(null);
    setEditText("");
  };

  // 🔹 Delete pesan
  const handleDelete = (id) => {
    socketRef.current.emit("deleteMessage", id);
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <button onClick={logout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">Logout</button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isOwn = msg.userId === user.id;
          return (
            <div key={msg.id} className={`max-w-lg p-2 rounded-lg ${isOwn ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-gray-900"}`}>
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
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">Kirim</button>
      </div>
    </div>
  );
}
