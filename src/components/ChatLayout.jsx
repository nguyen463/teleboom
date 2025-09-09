"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const API_URL = "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Validasi token
  const validateToken = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  };

  // Setup socket & user data
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("chat-app-token");
      const userData = localStorage.getItem("chat-user");
      if (!token || !userData) {
        window.location.href = "/login";
        return;
      }
      const isValid = await validateToken(token);
      if (!isValid) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      setUser(JSON.parse(userData));

      const newSocket = io(API_URL, { auth: { token } });
      newSocket.on("connect", () => setIsConnected(true));
      newSocket.on("disconnect", () => setIsConnected(false));
      setSocket(newSocket);

      return () => newSocket.disconnect();
    };
    init().finally(() => setLoading(false));
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("receive_message", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("load_messages", (msgs) => setMessages(msgs));
    socket.on("message_deleted", (id) => setMessages((prev) => prev.filter((m) => m._id !== id)));
    socket.on("message_updated", (msg) =>
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)))
    );
    socket.on("online_users", setOnlineUsers);

    return () => {
      socket.off("receive_message");
      socket.off("load_messages");
      socket.off("message_deleted");
      socket.off("message_updated");
      socket.off("online_users");
    };
  }, [socket]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Kirim pesan
  const handleSendMessage = () => {
    if (!message.trim() || !socket) return;

    if (editMessageId) {
      socket.emit("edit_message", { id: editMessageId, newText: message });
      setEditMessageId(null);
    } else {
      const tempMsg = {
        _id: Date.now(),
        senderId: user.id,
        senderName: user.displayName,
        text: message,
        createdAt: new Date(),
        status: "sending",
      };
      setMessages((prev) => [...prev, tempMsg]);
      socket.emit("chat_message", { text: message });
    }

    setMessage("");
  };

  const handleDeleteMessage = (id) => socket.emit("delete_message", id);
  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Memuat...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 text-white p-4 flex flex-col">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-xl">👤</span>
          </div>
          <div>
            <h2 className="font-semibold">{user.displayName}</h2>
            <p className="text-sm text-gray-400">@{user.username}</p>
          </div>
        </div>

        <div className="flex-1 mb-4">
          <h3 className="text-lg font-bold mb-3">👥 Online ({onlineUsers.length})</h3>
          <div className="bg-gray-700 p-3 rounded max-h-60 overflow-y-auto">
            {onlineUsers.map((u, i) => (
              <div key={u.userId || i} className="flex items-center mb-2 p-2 rounded hover:bg-gray-600">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>{u.displayName || u.username}</span>
                {u.userId === user.id && <span className="ml-2 text-xs text-gray-400">(Anda)</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center bg-white p-4 border-b shadow-sm">
          <div>
            <h1 className="text-xl font-bold">💬 Teleboom Chat</h1>
            <p className="text-sm text-gray-600">
              {isConnected ? "Online - Terhubung" : "Menghubungkan..."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center mt-10 text-gray-500">Belum ada pesan</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`relative mb-4 p-3 rounded-lg max-w-md shadow-md ${
                  msg.senderId === user.id
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-white text-gray-800 border"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    {msg.senderId === user.id ? "Anda" : msg.senderName}
                  </span>
                  <span className="text-xs opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.updatedAt && " (diedit)"}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.text}</p>
                {msg.senderId === user.id && (
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="p-1 bg-yellow-400 text-white rounded-full hover:bg-yellow-500"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="bg-white p-4 border-t shadow-inner">
          {editMessageId && (
            <div className="flex justify-between mb-2 bg-yellow-100 p-2 rounded">
              <span>Mengedit pesan...</span>
              <button onClick={() => setEditMessageId(null)} className="text-yellow-800">
                Batal
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ketik pesan..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {editMessageId ? "Update" : "Kirim"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
