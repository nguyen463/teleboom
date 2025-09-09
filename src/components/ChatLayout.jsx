"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";
import { FaTrash, FaEdit, FaPaperPlane, FaSignOutAlt, FaUser } from "react-icons/fa";

export default function ChatLayout() {
  const router = useRouter();
  const socket = useSocket();

  const [status, setStatus] = useState("Menghubungkan...");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("chat-user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // ====== KONEKSI SOCKET.IO ======
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      setStatus("Terhubung");
      setUserId(socket.id);
    });

    socket.on("disconnect", () => {
      setStatus("Terputus");
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("load_messages", (allMessages) => {
      setMessages(allMessages);
    });

    socket.on("message_deleted", (id) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });

    socket.on("message_updated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
      socket.off("load_messages");
      socket.off("message_deleted");
      socket.off("message_updated");
    };
  }, [socket]);

  // ====== KIRIM PESAN ======
  const handleSendMessage = () => {
    if (message.trim() === "") return;

    if (editMessageId) {
      socket.emit("edit_message", { id: editMessageId, newText: message });
      setEditMessageId(null);
    } else {
      socket.emit("chat_message", { 
        text: message, 
        id: socket.id,
        username: user?.username || "Anonymous",
        displayName: user?.displayName || "User"
      });
    }

    setMessage("");
  };

  // ====== HAPUS PESAN ======
  const handleDeleteMessage = (id) => {
    if (confirm("Yakin mau hapus pesan ini?")) {
      socket.emit("delete_message", id);
    }
  };

  // ====== EDIT PESAN ======
  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };

  // ====== LOGOUT ======
  const handleLogout = () => {
    localStorage.removeItem("chat-app-token");
    localStorage.removeItem("chat-user");
    router.push("/login");
  };

  // Format waktu
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-screen bg-telegram-bg text-telegram-text">
      {/* Sidebar */}
      <div className="w-80 bg-telegram-sidebar border-r border-telegram-border">
        {/* Header Sidebar */}
        <div className="p-4 bg-telegram-sidebar-header border-b border-telegram-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-telegram-primary rounded-full flex items-center justify-center text-white font-bold">
                {user?.displayName?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
              <div className="ml-3">
                <h2 className="font-semibold text-white">{user?.displayName || user?.username || "User"}</h2>
                <p className="text-telegram-secondary text-sm">{status}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-telegram-secondary hover:text-white hover:bg-telegram-hover rounded-lg transition-colors"
              title="Logout"
            >
              <FaSignOutAlt size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-telegram-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari percakapan..."
              className="w-full bg-telegram-input text-white placeholder-telegram-secondary px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-primary"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="p-2">
          <div className="bg-telegram-active-chat rounded-lg p-3 mb-2">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-telegram-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                💬
              </div>
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-white">Chat Room</h3>
                  <span className="text-telegram-secondary text-xs">Sekarang</span>
                </div>
                <p className="text-telegram-secondary text-sm truncate">
                  {messages.length > 0 
                    ? `${messages[messages.length - 1]?.displayName || messages[messages.length - 1]?.username}: ${messages[messages.length - 1]?.text}`
                    : "Mulai percakapan..."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Area Chat Utama */}
      <div className="flex-1 flex flex-col bg-telegram-chat-bg">
        {/* Header Chat */}
        <header className="bg-telegram-chat-header border-b border-telegram-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-telegram-primary rounded-full flex items-center justify-center text-white font-bold mr-3">
                💬
              </div>
              <div>
                <h1 className="font-semibold text-white">TeleBoom Chat</h1>
                <p className="text-telegram-secondary text-sm">
                  {messages.length} pesan • {status}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Daftar Pesan */}
        <main className="flex-1 p-6 overflow-y-auto bg-telegram-chat-bg bg-opacity-50">
          {messages.length === 0 ? (
            <div className="text-center mt-20">
              <div className="w-20 h-20 bg-telegram-primary bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaPaperPlane size={32} className="text-telegram-primary" />
              </div>
              <h3 className="text-telegram-secondary font-semibold mb-2">Belum ada pesan</h3>
              <p className="text-telegram-secondary text-sm">
                Kirim pesan pertama untuk memulai percakapan
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-xs lg:max-w-md xl:max-w-lg 2xl:max-w-xl ${
                      msg.id === userId
                        ? "bg-telegram-my-message text-white"
                        : "bg-telegram-their-message text-telegram-text"
                    } rounded-2xl px-4 py-2 shadow-sm`}
                  >
                    {/* Header Pesan */}
                    {msg.id !== userId && (
                      <div className="flex items-center mb-1">
                        <span className="font-semibold text-telegram-primary text-sm">
                          {msg.displayName || msg.username || "Anonymous"}
                        </span>
                        <span className="text-telegram-secondary text-xs ml-2">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    {/* Isi Pesan */}
                    <p className="text-sm leading-relaxed">{msg.text}</p>

                    {/* Timestamp untuk pesan sendiri */}
                    {msg.id === userId && (
                      <div className="flex items-center justify-end mt-1">
                        <span className="text-telegram-secondary text-xs">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    {/* Tombol Edit & Hapus untuk pesan sendiri */}
                    {msg.id === userId && (
                      <div className="absolute -top-2 -right-8 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditMessage(msg)}
                          className="p-1 bg-telegram-bg rounded text-telegram-secondary hover:text-telegram-primary"
                          title="Edit pesan"
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="p-1 bg-telegram-bg rounded text-telegram-secondary hover:text-red-500"
                          title="Hapus pesan"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Input Pesan */}
        <footer className="bg-telegram-chat-header border-t border-telegram-border p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder={
                editMessageId ? "Edit pesan Anda..." : "Ketik pesan..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-telegram-input text-white placeholder-telegram-secondary px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-telegram-primary border-none"
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className={`p-3 rounded-full transition-all duration-200 ${
                message.trim()
                  ? "bg-telegram-primary hover:bg-telegram-primary-hover text-white"
                  : "bg-telegram-input text-telegram-secondary cursor-not-allowed"
              }`}
              title={editMessageId ? "Update pesan" : "Kirim pesan"}
            >
              <FaPaperPlane size={18} />
            </button>
          </div>
        </footer>
      </div>

      {/* CSS untuk tema Telegram */}
      <style jsx>{`
        :root {
          --telegram-bg: #0f1923;
          --telegram-sidebar: #182533;
          --telegram-sidebar-header: #202c3d;
          --telegram-chat-bg: #0f1923;
          --telegram-chat-header: #202c3d;
          --telegram-input: #2a3b4d;
          --telegram-primary: #0088cc;
          --telegram-primary-hover: #0077b3;
          --telegram-secondary: #7c8b9a;
          --telegram-text: #ffffff;
          --telegram-my-message: #0088cc;
          --telegram-their-message: #2a3b4d;
          --telegram-border: #2a3b4d;
          --telegram-hover: #2a3b4d;
          --telegram-active-chat: #2a3b4d;
        }

        .bg-telegram-bg { background-color: var(--telegram-bg); }
        .bg-telegram-sidebar { background-color: var(--telegram-sidebar); }
        .bg-telegram-sidebar-header { background-color: var(--telegram-sidebar-header); }
        .bg-telegram-chat-bg { background-color: var(--telegram-chat-bg); }
        .bg-telegram-chat-header { background-color: var(--telegram-chat-header); }
        .bg-telegram-input { background-color: var(--telegram-input); }
        .bg-telegram-primary { background-color: var(--telegram-primary); }
        .bg-telegram-primary-hover { background-color: var(--telegram-primary-hover); }
        .bg-telegram-my-message { background-color: var(--telegram-my-message); }
        .bg-telegram-their-message { background-color: var(--telegram-their-message); }
        .bg-telegram-hover { background-color: var(--telegram-hover); }
        .bg-telegram-active-chat { background-color: var(--telegram-active-chat); }

        .text-telegram-text { color: var(--telegram-text); }
        .text-telegram-secondary { color: var(--telegram-secondary); }
        .text-telegram-primary { color: var(--telegram-primary); }

        .border-telegram-border { border-color: var(--telegram-border); }
      `}</style>
    </div>
  );
}
