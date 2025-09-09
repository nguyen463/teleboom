"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import sanitizeHtml from "sanitize-html";
import { FaTrash, FaEdit, FaSignOutAlt, FaUser, FaPaperPlane, FaUsers, FaSpinner } from "react-icons/fa";

// URL backend Socket.IO
const SOCKET_URL = "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [hasAuthError, setHasAuthError] = useState(false);

  // ===== CEK LOGIN & KONEKSI SOCKET =====
  useEffect(() => {
    let userData = null;
    let token = null;

    try {
      token = localStorage.getItem("chat-app-token");
      userData = localStorage.getItem("chat-user");
      
      console.log("Token ditemukan:", !!token);
      console.log("Data pengguna ditemukan:", !!userData);

      if (!token || !userData) {
        setHasAuthError(true);
        return;
      }

      const userObj = JSON.parse(userData);
      setUser(userObj);

      const newSocket = io(SOCKET_URL, {
        auth: { token },
      });

      newSocket.on("connect", () => {
        setIsConnected(true);
        console.log("🔗 Terhubung ke server Socket.IO");
      });

      newSocket.on("disconnect", () => {
        setIsConnected(false);
        console.log("❌ Terputus dari server Socket.IO");
      });
      
      newSocket.on("error", (msg) => {
          console.error("❌ Socket Error:", msg);
      });

      setSocket(newSocket);

      // Clean up on component unmount
      return () => {
        newSocket.disconnect();
      };

    } catch (error) {
      console.error("❌ Gagal memuat data pengguna:", error.message);
      setHasAuthError(true);
    }
  }, []);

  // ===== SOCKET EVENTS =====
  useEffect(() => {
    if (!socket || !user) return;

    // Mendengarkan pesan dari backend
    const handleReceiveMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const handleLoadMessages = (msgs) => setMessages(msgs || []);
    const handleDeleteMessage = (id) => setMessages((prev) => prev.filter((m) => m._id !== id));
    const handleUpdateMessage = (updated) =>
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    const handleOnlineUsers = (users) => setOnlineUsers(users || []);
    
    socket.on("receive_message", handleReceiveMessage);
    socket.on("load_messages", handleLoadMessages);
    socket.on("message_deleted", handleDeleteMessage);
    socket.on("message_updated", handleUpdateMessage);
    socket.on("online_users", handleOnlineUsers);
    
    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("load_messages", handleLoadMessages);
      socket.off("message_deleted", handleDeleteMessage);
      socket.off("message_updated", handleUpdateMessage);
      socket.off("online_users", handleOnlineUsers);
    };
  }, [socket, user]);

  // ===== AUTO SCROLL =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== KIRIM PESAN =====
  const handleSendMessage = () => {
    if (message.trim() === "" || !socket || isSending) return;

    setIsSending(true);

    if (editMessageId) {
      socket.emit("edit_message", {
        id: editMessageId,
        newText: message,
      });
      setEditMessageId(null);
    } else {
      const sanitizedText = sanitizeHtml(message.trim(), {
        allowedTags: [],
        allowedAttributes: {},
      });
      
      const tempId = Date.now().toString();
      const newMessage = {
        tempId,
        text: sanitizedText,
        senderId: user.id,
        senderName: user.displayName,
        createdAt: new Date(),
        status: "sending",
      };
      setMessages((prev) => [...prev, newMessage]);
      socket.emit("chat_message", { text: sanitizedText, senderName: user.displayName });
    }

    setMessage("");
    setIsSending(false); 
  };

  const handleDeleteMessage = (id) => socket?.emit("delete_message", id);
  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };
  const cancelEdit = () => {
    setEditMessageId(null);
    setMessage("");
  };

  const handleLogout = () => {
    socket?.disconnect();
    localStorage.clear();
    window.location.href = "https://teleboom.vercel.app/login";
  };

  if (!user || hasAuthError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-4 text-center bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800">Sesi Habis atau Belum Login</h2>
          <p className="text-gray-600">Silakan login kembali untuk mengakses chat.</p>
          <a
            href="https://teleboom.vercel.app/login"
            className="inline-block w-full py-2 font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Masuk
          </a>
        </div>
      </div>
    );
  }

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
                <p className="text-telegram-secondary text-sm">{isConnected ? "Online" : "Terputus"}</p>
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
                    ? `${messages[messages.length - 1]?.senderName || "Anonim"}: ${messages[messages.length - 1]?.text}`
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
                  {messages.length} pesan • {isConnected ? "Online" : "Terputus"}
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
                  key={msg._id || msg.tempId || index}
                  className={`flex group ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-xs lg:max-w-md xl:max-w-lg 2xl:max-w-xl ${
                      msg.senderId === user.id
                        ? "bg-telegram-my-message text-white"
                        : "bg-telegram-their-message text-telegram-text"
                    } rounded-2xl px-4 py-2 shadow-sm`}
                  >
                    {/* Header Pesan */}
                    {msg.senderId !== user.id && (
                      <div className="flex items-center mb-1">
                        <span className="font-semibold text-telegram-primary text-sm">
                          {msg.senderName || "Anonim"}
                        </span>
                        <span className="text-telegram-secondary text-xs ml-2">
                          {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Isi Pesan */}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    
                    {/* Timestamp & Edit/Hapus untuk pesan sendiri */}
                    {msg.senderId === user.id && (
                      <div className="flex items-center justify-end mt-1">
                        <span className="text-telegram-secondary text-xs mr-2">
                          {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {editMessageId === msg._id && (
                          <span className="text-telegram-secondary text-xs mr-1">
                            (diedit)
                          </span>
                        )}
                        <div className="absolute -top-2 -right-8 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditMessage(msg)}
                            className="p-1 bg-telegram-chat-bg rounded-full text-telegram-secondary hover:text-telegram-primary"
                            title="Edit pesan"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="p-1 bg-telegram-chat-bg rounded-full text-telegram-secondary hover:text-red-500"
                            title="Hapus pesan"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Pesan */}
        <footer className="bg-telegram-chat-header border-t border-telegram-border p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder={editMessageId ? "Edit pesan Anda..." : "Ketik pesan..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-telegram-input text-white placeholder-telegram-secondary px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-telegram-primary border-none"
              disabled={isSending || !isConnected}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending || !isConnected}
              className={`p-3 rounded-full transition-all duration-200 ${
                !message.trim() || !isConnected
                  ? "bg-telegram-input text-telegram-secondary cursor-not-allowed"
                  : "bg-telegram-primary hover:bg-telegram-primary-hover text-white"
              }`}
              title={editMessageId ? "Update pesan" : "Kirim pesan"}
            >
              {isSending ? (
                <FaSpinner className="animate-spin" size={18} />
              ) : (
                <FaPaperPlane size={18} />
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
