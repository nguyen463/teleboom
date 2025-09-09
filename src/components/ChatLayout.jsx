"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import {
  FaSignOutAlt,
  FaPaperPlane,
  FaUsers,
  FaEdit,
  FaTrash,
  FaChevronDown,
} from "react-icons/fa";

const API_URL = "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [editMessageId, setEditMessageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // ===== Fungsi validasi token =====
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

  // ===== Cek login dan koneksi socket =====
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("chat-app-token");
        const userData = localStorage.getItem("chat-user");

        if (!token || !userData) throw new Error("Belum login");

        const isValid = await validateToken(token);
        if (!isValid) throw new Error("Sesi tidak valid");

        const userObj = JSON.parse(userData);
        setUser(userObj);

        const newSocket = io(API_URL, { auth: { token } });

        newSocket.on("connect", () => console.log("✅ Socket connected"));
        newSocket.on("load_messages", (msgs) => setMessages(msgs || []));
        newSocket.on("receive_message", (msg) => {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        });
        newSocket.on("message_deleted", (id) =>
          setMessages((prev) => prev.filter((m) => m._id !== id))
        );
        newSocket.on("message_updated", (updated) =>
          setMessages((prev) =>
            prev.map((m) => (m._id === updated._id ? updated : m))
          )
        );
        newSocket.on("online_users", (users) => setOnlineUsers(users || []));

        setSocket(newSocket);
        setLoading(false);

        return () => newSocket.disconnect();
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    };
    init();
  }, []);

  // ===== Auto scroll =====
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ===== Kirim pesan =====
  const handleSendMessage = () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);

    if (editMessageId) {
      socket.emit("edit_message", { id: editMessageId, newText: message });
      setEditMessageId(null);
    } else {
      socket.emit("chat_message", { text: message });
    }

    setMessage("");
    setIsSending(false);
  };

  // ===== Hapus pesan =====
  const handleDeleteMessage = (id) => socket.emit("delete_message", id);

  // ===== Edit pesan =====
  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };

  const cancelEdit = () => {
    setEditMessageId(null);
    setMessage("");
  };

  // ===== Logout =====
  const handleLogout = () => {
    socket?.disconnect();
    localStorage.clear();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-700 text-lg">
        Memuat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-4 shadow-md border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {user.displayName?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold">{user.displayName}</h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>

        {/* Dropdown pengguna online */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300 transition"
          >
            <FaUsers />
            <span>{onlineUsers.length} Online</span>
            <FaChevronDown
              className={`transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white shadow-md rounded p-3 border z-50">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded"
                  >
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>{u.displayName || u.username}</span>
                    {u.userId === user.id && (
                      <span className="ml-auto text-xs text-gray-400">(Anda)</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">Tidak ada yang online</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
        >
          <FaSignOutAlt /> Logout
        </button>
      </header>

      {/* Area chat */}
      <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center mt-20 text-gray-400">
            Belum ada pesan. Mulai percakapan!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`mb-3 p-3 rounded-lg shadow ${
                msg.senderId === user.id
                  ? "bg-blue-500 text-white ml-auto max-w-xs"
                  : "bg-white text-gray-800 mr-auto max-w-xs border"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold">
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
              <p className="break-words">{msg.text}</p>
              {msg.senderId === user.id && (
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => handleEditMessage(msg)}
                    className="text-yellow-400 hover:text-yellow-500"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input pesan */}
      <footer className="bg-white p-4 border-t shadow-inner">
        {editMessageId && (
          <div className="flex justify-between items-center bg-yellow-100 text-yellow-800 p-2 rounded mb-2">
            <span>Sedang mengedit pesan...</span>
            <button onClick={cancelEdit} className="hover:underline">
              Batalkan
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={editMessageId ? "Edit pesan..." : "Ketik pesan..."}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-400"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded-lg transition"
          >
            {editMessageId ? "Update" : <FaPaperPlane />}
          </button>
        </div>
      </footer>
    </div>
  );
}
