"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const API_URL = "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Validasi token di backend
  const validateToken = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  };

  // Cek login & setup koneksi socket
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("chat-app-token");
      const userData = localStorage.getItem("chat-user");

      if (!token || !userData || !(await validateToken(token))) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      const newSocket = io(API_URL, {
        auth: { token },
      });

      newSocket.on("connect", () => console.log("✅ Socket connected"));
      newSocket.on("disconnect", () => console.log("❌ Socket disconnected"));

      // Ambil pesan lama
      newSocket.on("load_messages", (msgs) => setMessages(msgs));

      // Pesan baru realtime
      newSocket.on("receive_message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      // Pesan dihapus
      newSocket.on("message_deleted", (id) =>
        setMessages((prev) => prev.filter((m) => m._id !== id))
      );

      // Pesan diupdate
      newSocket.on("message_updated", (updated) =>
        setMessages((prev) =>
          prev.map((m) => (m._id === updated._id ? updated : m))
        )
      );

      // Pengguna online realtime
      newSocket.on("online_users", (users) => setOnlineUsers(users));

      setSocket(newSocket);
      setLoading(false);

      return () => newSocket.disconnect();
    };

    init();
  }, []);

  // Scroll otomatis ke pesan terakhir
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && socket) {
      socket.emit("chat_message", {
        text: message.trim(),
        senderName: user.displayName || "Anonim",
      });
      setMessage("");
    }
  };

  const handleDelete = (id) => {
    socket.emit("delete_message", id);
  };

  const handleEdit = (msg) => {
    const newText = prompt("Edit pesan:", msg.text);
    if (newText && newText !== msg.text) {
      socket.emit("edit_message", { id: msg._id, newText });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    socket.disconnect();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="flex justify-between items-center bg-blue-600 text-white p-4 shadow">
        <h1 className="text-lg font-bold">💬 Teleboom Chat</h1>
        <div className="flex gap-4 items-center">
          <span>👥 Online: {onlineUsers.length}</span>
          <span>{user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Area Chat */}
      <main className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`p-3 mb-3 rounded-lg shadow ${
              msg.senderId === user.id
                ? "bg-blue-500 text-white ml-auto max-w-xs"
                : "bg-white text-gray-800 max-w-xs"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold">
                {msg.senderId === user.id ? "Anda" : msg.senderName || "Anonim"}
              </span>
              <span className="text-xs opacity-70">
                {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p>{msg.text}</p>
            {msg.senderId === user.id && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(msg)}
                  className="text-yellow-500 hover:text-yellow-600 text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(msg._id)}
                  className="text-red-500 hover:text-red-600 text-xs"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Pesan */}
      <footer className="p-4 bg-white flex gap-2 shadow-inner">
        <input
          type="text"
          value={message}
          placeholder="Ketik pesan..."
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Kirim
        </button>
      </footer>
    </div>
  );
}
