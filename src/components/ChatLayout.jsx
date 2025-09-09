"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import {
  FaArrowLeft,
  FaTrash,
  FaEdit,
  FaEllipsisV,
  FaPaperPlane,
  FaUser,
  FaHome,
  FaComments,
} from "react-icons/fa";

const API_URL = "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAuthError, setHasAuthError] = useState(false);
  const messagesEndRef = useRef(null);

  // ===== CEK LOGIN & KONEKSI SOCKET =====
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("chat-app-token");
        const userData = localStorage.getItem("chat-user");

        if (!token || !userData) throw new Error("Token tidak ditemukan");

        const userObj = JSON.parse(userData);
        setUser(userObj);

        // Validasi token
        const res = await axios.get(`${API_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status !== 200) throw new Error("Token tidak valid");

        // Koneksi socket
        const newSocket = io(API_URL, { auth: { token } });

        newSocket.on("connect", () => setIsConnected(true));
        newSocket.on("disconnect", () => setIsConnected(false));
        newSocket.on("load_messages", (msgs) => setMessages(msgs));
        newSocket.on("receive_message", (msg) =>
          setMessages((prev) => [...prev, msg])
        );
        newSocket.on("message_updated", (updated) =>
          setMessages((prev) =>
            prev.map((m) => (m._id === updated._id ? updated : m))
          )
        );
        newSocket.on("message_deleted", (id) =>
          setMessages((prev) => prev.filter((m) => m._id !== id))
        );

        setSocket(newSocket);

        return () => newSocket.disconnect();
      } catch (err) {
        console.error("❌ Auth Error:", err.message);
        localStorage.clear();
        setHasAuthError(true);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ===== SCROLL OTOMATIS =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== KIRIM / EDIT PESAN =====
  const handleSendMessage = () => {
    if (message.trim() === "" || !socket) return;

    if (editMessageId) {
      socket.emit("edit_message", {
        id: editMessageId,
        newText: message,
      });
      setEditMessageId(null);
    } else {
      socket.emit("chat_message", { text: message });
    }
    setMessage("");
  };

  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };

  const handleDeleteMessage = (id) => socket.emit("delete_message", id);

  const cancelEdit = () => {
    setEditMessageId(null);
    setMessage("");
  };

  const handleLogout = () => {
    socket?.disconnect();
    localStorage.clear();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mt-3 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (hasAuthError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 text-center bg-white rounded shadow">
          <h2 className="text-xl font-bold">Sesi Habis</h2>
          <p className="text-gray-600">Silakan login kembali.</p>
          <a
            href="/login"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5]">
      {/* HEADER TELEGRAM */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0088cc] shadow">
        <div className="flex items-center gap-3">
          <FaArrowLeft size={20} className="text-white cursor-pointer" />
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName}
                className="rounded-full w-10 h-10"
              />
            ) : (
              <FaUser size={20} className="text-gray-600" />
            )}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">
              {user?.displayName}
            </h2>
            <p className="text-xs text-white opacity-80">
              {isConnected ? "online" : "menghubungkan..."}
            </p>
          </div>
        </div>
        <FaEllipsisV size={18} className="text-white cursor-pointer" />
      </header>

      {/* AREA CHAT */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('/telegram-bg.png')] bg-cover bg-center">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`relative max-w-xs md:max-w-md p-3 rounded-2xl shadow ${
              msg.senderId === user.id
                ? "bg-[#0088cc] text-white ml-auto rounded-tr-none"
                : "bg-white text-gray-800 rounded-tl-none"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs">
                {msg.senderId === user.id ? "Anda" : msg.senderName}
              </span>
              <span className="text-[10px] opacity-70">
                {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p>{msg.text}</p>
            {msg.senderId === user.id && (
              <div className="absolute -top-2 -right-2 flex gap-1">
                <button
                  onClick={() => handleEditMessage(msg)}
                  className="p-1 bg-yellow-400 rounded-full text-white hover:bg-yellow-500"
                >
                  <FaEdit size={12} />
                </button>
                <button
                  onClick={() => handleDeleteMessage(msg._id)}
                  className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* MENU BAWAH */}
      <footer className="bg-white border-t p-3 flex flex-col gap-2">
        {editMessageId && (
          <div className="flex items-center justify-between bg-yellow-100 p-2 rounded">
            <span className="text-sm">Mengedit pesan...</span>
            <button onClick={cancelEdit} className="text-xs text-red-500">
              Batalkan
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ketik pesan"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            className="flex-1 px-4 py-3 rounded-full bg-gray-100 border focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
          />
          <button
            onClick={handleSendMessage}
            className="p-3 rounded-full bg-[#0088cc] text-white hover:bg-[#007ab8]"
          >
            <FaPaperPlane size={18} />
          </button>
        </div>

        {/* MENU NAVIGASI */}
        <div className="flex justify-around pt-2 mt-1 border-t text-gray-600">
          <button className="flex flex-col items-center hover:text-[#0088cc] transition">
            <FaHome size={20} />
            <span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center text-[#0088cc] transition">
            <FaComments size={20} />
            <span className="text-xs">Chat</span>
          </button>
          <button className="flex flex-col items-center hover:text-[#0088cc] transition">
            <FaUser size={20} />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
