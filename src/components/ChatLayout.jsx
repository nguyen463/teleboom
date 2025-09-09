"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import {
  FaTrash,
  FaEdit,
  FaSignOutAlt,
  FaUser,
  FaPaperPlane,
  FaUsers,
  FaSpinner,
} from "react-icons/fa";

// URL backend Socket.IO
// Ganti URL ini dengan URL backend Heroku-mu saat deployment
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
      const tempId = Date.now().toString();
      const newMessage = {
        tempId,
        text: message.trim(),
        senderId: user.id,
        senderName: user.displayName,
        createdAt: new Date(),
        status: "sending",
      };
      setMessages((prev) => [...prev, newMessage]);
      socket.emit("chat_message", { text: newMessage.text });
    }

    setMessage("");
    setIsSending(false); // Reset isSending after emit
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 text-white p-4 flex flex-col">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full" />
            ) : (
              <span className="text-white text-xl">👤</span>
            )}
          </div>
          <div>
            <h2 className="font-semibold">{user.displayName}</h2>
            <p className="text-sm text-gray-400">@{user.username}</p>
          </div>
        </div>

        {/* Pengguna Online */}
        <div className="flex-1 mb-4">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-xl">👥</span> Pengguna Online ({onlineUsers.length})
          </h3>
          <div className="bg-gray-700 p-3 rounded max-h-60 overflow-y-auto">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((onlineUser, index) => (
                <div key={onlineUser.userId || index} className="flex items-center mb-2 p-2 rounded hover:bg-gray-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>{onlineUser.displayName || onlineUser.username}</span>
                  {onlineUser.userId === user.id && (
                    <span className="ml-2 text-xs text-gray-400">(Anda)</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Tidak ada pengguna online</p>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 mt-4 transition-colors"
        >
          <span>➡️</span> Logout
        </button>
      </div>

      {/* Area Chat */}
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center bg-white p-4 border-b shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-800">💬 Teleboom Chat</h1>
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
            <div className="text-center mt-10">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">Mulai percakapan pertama Anda!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg._id || msg.tempId || index}
                className={`relative mb-4 p-3 rounded-lg max-w-md shadow-md transition-all duration-200 ${
                  msg.senderId === user.id
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-white text-gray-800 border"
                } ${msg.status === "sending" ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    {msg.senderId === user.id ? "Anda" : msg.senderName || "Anonim"}
                  </span>
                  <span className="text-xs opacity-70">
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Baru saja"}
                    {msg.updatedAt && " (diedit)"}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.text}</p>
                {msg.senderId === user.id && (
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="p-1 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 transition-colors"
                      title="Edit pesan"
                    >
                      <span>✏️</span>
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Hapus pesan"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Pesan */}
        <footer className="bg-white p-4 border-t shadow-inner">
          {editMessageId && (
            <div className="flex items-center justify-between mb-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
              <span className="text-sm">Sedang mengedit pesan...</span>
              <button onClick={cancelEdit} className="text-yellow-800 hover:text-yellow-900 text-sm">
                Batalkan
              </button>
            </div>
          )}

          <div className="flex gap-2">
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
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isSending}
            />

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
            >
              {isSending ? (
                <FaSpinner className="animate-spin" size={20} />
              ) : (
                <span>✉️</span>
              )}
              {editMessageId ? "Update" : "Kirim"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
