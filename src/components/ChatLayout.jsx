"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaTrash, FaEdit, FaSignOutAlt, FaUser, FaExclamationTriangle, FaPaperPlane } from "react-icons/fa";

export default function ChatLayout() {
  const router = useRouter();
  const [status, setStatus] = useState("❌ Backend sedang maintenance");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ====== CEK USER LOGIN ======
  useEffect(() => {
    const token = sessionStorage.getItem("chat-app-token");
    const userData = sessionStorage.getItem("chat-user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    
    setUser(JSON.parse(userData));
    
    // Load messages from localStorage if available
    const savedMessages = localStorage.getItem("chat-messages");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Error parsing saved messages:", e);
      }
    }
  }, [router]);

  // ====== SIMPAN PESAN KE LOCALSTORAGE ======
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // ====== KIRIM PESAN (LOCAL ONLY) ======
  const handleSendMessage = () => {
    if (message.trim() === "") return;
    
    setIsSending(true);

    if (editMessageId) {
      // Edit pesan yang sudah ada
      setMessages(prev => prev.map(msg => 
        msg._id === editMessageId ? { ...msg, text: message, updatedAt: new Date() } : msg
      ));
      setEditMessageId(null);
    } else {
      // Buat pesan baru
      const newMessage = {
        _id: Date.now().toString(),
        text: message,
        senderId: user?.id || "local-user",
        senderName: user?.displayName || "You",
        createdAt: new Date(),
        isLocal: true
      };
      
      setMessages(prev => [...prev, newMessage]);
    }
    
    setMessage("");
    setIsSending(false);
    console.log("Pesan disimpan lokal (backend maintenance)");
  };

  // ====== HAPUS PESAN ======
  const handleDeleteMessage = (id) => {
    if (confirm("Yakin mau hapus pesan ini?")) {
      setMessages(prev => prev.filter(msg => msg._id !== id));
      
      // Jika menghapus semua pesan, hapus juga dari localStorage
      if (messages.length === 1) {
        localStorage.removeItem("chat-messages");
      }
    }
  };

  // ====== EDIT PESAN ======
  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };

  // ====== BATAL EDIT ======
  const cancelEdit = () => {
    setEditMessageId(null);
    setMessage("");
  };

  // ====== LOGOUT ======
  const handleLogout = () => {
    sessionStorage.removeItem("chat-app-token");
    sessionStorage.removeItem("chat-user");
    localStorage.removeItem("chat-messages"); // Bersihkan pesan lokal saat logout
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Memuat...</p>
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
              <FaUser className="text-white" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{user.displayName}</h2>
            <p className="text-sm text-gray-400">@{user.username}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">Status Server</h3>
          <div className="p-2 rounded text-sm bg-red-600 flex items-center">
            <span className="animate-pulse mr-2">●</span> 
            {status}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Backend sedang dalam perbaikan. Pesan hanya disimpan sementara di browser Anda.
          </p>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold mb-3">Online Users</h3>
          <div className="bg-gray-700 p-3 rounded">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>{user.displayName} (Anda)</span>
            </div>
            <p className="text-gray-400 text-sm mt-3">Tidak ada pengguna lain yang online</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 mt-4 transition-colors"
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
        <main className="flex-1 p-4 overflow-y-auto bg-gray-50" id="chat-messages">
          {messages.length === 0 ? (
            <div className="text-center mt-10">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">Mulai percakapan pertama Anda!</p>
              <p className="text-gray-400 text-sm mt-2">
                Pesan yang Anda kirim akan disimpan sementara di browser Anda.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`relative mb-4 p-3 rounded-lg max-w-md shadow-md transition-all duration-200 ${
                  msg.senderId === user.id
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {/* Header Pesan */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    {msg.senderId === user.id ? "Anda" : msg.senderName || "Anonim"}
                  </span>
                  <span className="text-xs opacity-70">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('id-ID', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'Baru saja'}
                  </span>
                </div>

                {/* Isi Pesan */}
                <p className="text-sm break-words">{msg.text}</p>

                {/* Badge Local */}
                {msg.isLocal && (
                  <span className="absolute -top-2 -left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    Local
                  </span>
                )}

                {/* Tombol Edit & Hapus */}
                {msg.senderId === user.id && (
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="p-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors"
                      title="Edit pesan"
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
          {editMessageId && (
            <div className="flex items-center justify-between mb-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
              <span className="text-sm">Sedang mengedit pesan...</span>
              <button 
                onClick={cancelEdit}
                className="text-yellow-800 hover:text-yellow-900 text-sm"
              >
                Batalkan
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
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
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isSending}
            />

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FaPaperPlane />
              )}
              {editMessageId ? "Update" : "Kirim"}
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-yellow-600 text-sm">
            <FaExclamationTriangle />
            <span>Mode offline - pesan hanya disimpan sementara di browser</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
