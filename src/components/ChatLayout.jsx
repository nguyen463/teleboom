"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaTrash, FaEdit, FaSignOutAlt, FaUser, FaExclamationTriangle } from "react-icons/fa";

export default function ChatLayout() {
  const router = useRouter();
  const [status, setStatus] = useState("❌ Backend sedang maintenance");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // ====== CEK USER LOGIN ======
  useEffect(() => {
    const token = sessionStorage.getItem("chat-app-token");
    const userData = sessionStorage.getItem("chat-user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    
    setUser(JSON.parse(userData));
  }, [router]);

  // ====== KIRIM PESAN (LOCAL ONLY) ======
  const handleSendMessage = () => {
    if (message.trim() === "") return;

    // Simpan pesan lokal saja dulu
    const newMessage = {
      _id: Date.now().toString(),
      text: message,
      senderId: "local-user",
      senderName: user?.displayName || "You",
      createdAt: new Date(),
      isLocal: true // Flag untuk pesan lokal
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    console.log("Pesan disimpan lokal (backend maintenance)");
  };

  // ====== HAPUS PESAN ======
  const handleDeleteMessage = (id) => {
    if (confirm("Yakin mau hapus pesan ini?")) {
      setMessages(prev => prev.filter(msg => msg._id !== id));
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
          <h3 className="text-lg font-bold mb-3">Status Server</h3>
          <div className="p-2 rounded text-sm bg-red-600">
            {status}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Backend sedang dalam perbaikan. Pesan hanya disimpan sementara.
          </p>
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
            <p className="text-sm text-gray-600">Offline Mode</p>
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
              <p className="text-gray-400 text-sm">
                Note: Pesan hanya disimpan sementara (local storage)
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`relative mb-4 p-3 rounded-lg max-w-md shadow-md ${
                  msg.senderId === "local-user"
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {/* Header Pesan */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    {msg.senderId === "local-user" ? "Anda" : msg.senderName || "Anonim"}
                  </span>
                  <span className="text-xs opacity-70">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : 'Baru saja'}
                  </span>
                </div>

                {/* Isi Pesan */}
                <p className="text-sm">{msg.text}</p>

                {/* Badge Local */}
                {msg.isLocal && (
                  <span className="absolute -top-2 -left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    Local
                  </span>
                )}

                {/* Tombol Edit & Hapus */}
                {msg.senderId === "local-user" && (
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
            />

            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {editMessageId ? "Update" : "Kirim"}
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-yellow-600 text-sm">
            <FaExclamationTriangle />
            <span>Mode offline - pesan hanya disimpan sementara</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
