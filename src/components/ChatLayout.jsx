"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";
import { FaTrash, FaEdit, FaSignOutAlt, FaUser } from "react-icons/fa";

export default function ChatLayout() {
  const router = useRouter();
  const socket = useSocket();

  const [status, setStatus] = useState("Menghubungkan...");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);

  // ====== CEK USER LOGIN ======
  useEffect(() => {
    const token = sessionStorage.getItem("chat-app-token");
    const userData = sessionStorage.getItem("chat-user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    
    setUser(JSON.parse(userData));
  }, []);

  // ====== KONEKSI SOCKET.IO ======
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      setStatus("✅ Terhubung ke server!");
      setUserId(socket.id);
    });

    socket.on("disconnect", () => {
      setStatus("❌ Terputus dari server.");
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
    if (message.trim() === "" || !socket) return;

    if (editMessageId) {
      socket.emit("edit_message", { id: editMessageId, newText: message });
      setEditMessageId(null);
    } else {
      socket.emit("chat_message", { 
        text: message, 
        senderId: socket.id,
        senderName: user?.displayName || "Anonymous" 
      });
    }

    setMessage("");
  };

  // ====== HAPUS PESAN ======
  const handleDeleteMessage = (id) => {
    if (confirm("Yakin mau hapus pesan ini?") && socket) {
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
    sessionStorage.removeItem("chat-app-token");
    sessionStorage.removeItem("chat-user");
    if (socket) socket.disconnect();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 text-white p-4 flex flex-col">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
            <FaUser className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold">{user.displayName}</h2>
            <p className="text-sm text-gray-400">@{user.username}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">Status Koneksi</h3>
          <div className={`p-2 rounded text-sm ${
            status.includes("✅") ? "bg-green-600" : "bg-red-600"
          }`}>
            {status}
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold mb-3">Online Users</h3>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-gray-400 text-sm">Fitur user online coming soon...</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 mt-4"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>

      {/* Area Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-4 border-b shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-800">💬 Teleboom Chat</h1>
            <p className="text-sm text-gray-600">Real-time messaging</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        </header>

        {/* Daftar Pesan */}
        <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center mt-10">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">Mulai percakapan pertama Anda!</p>
              <p className="text-gray-400 text-sm">Kirim pesan untuk memulai chat</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`relative mb-4 p-3 rounded-lg max-w-md shadow-md ${
                  msg.senderId === userId
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {/* Header Pesan */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    {msg.senderId === userId ? "Anda" : msg.senderName || "Anonim"}
                  </span>
                  <span className="text-xs opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Isi Pesan */}
                <p className="text-sm">{msg.text}</p>

                {/* Tombol Edit & Hapus */}
                {msg.senderId === userId && (
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="p-1 bg-yellow-400 text-white rounded hover:bg-yellow-500"
                      title="Edit pesan"
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      title="Hapus pesan"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </main>

        {/* Input Pesan */}
        <footer className="bg-white p-4 border-t shadow-inner">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={
                editMessageId ? "Edit pesan Anda..." : "Ketik pesan..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!socket || status.includes("❌")}
            />

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || !socket || status.includes("❌")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {editMessageId ? "Update" : "Kirim"}
            </button>
          </div>
          
          {status.includes("❌") && (
            <p className="text-red-500 text-sm mt-2">
              Tidak terhubung ke server. Silakan refresh halaman.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
