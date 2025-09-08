"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaTrash, FaEdit, FaSignOutAlt, FaUser, FaPaperPlane, FaWifi, FaRegCircle, FaUsers, FaSync, FaExclamationTriangle, FaRedo } from "react-icons/fa";
import { useSocket } from "@/hooks/useSocket";

export default function ChatLayout() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);
  
  // Gunakan hook socket
  const { socket, connectionStatus, isConnected, isConnecting, hasError } = useSocket();

  // Status berdasarkan koneksi socket
  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return "✅ Terhubung ke server";
      case 'connecting':
        return "🔄 Menghubungkan ke server...";
      case 'error':
        return `❌ Gagal terhubung (${retryCount > 0 ? `attempt ${retryCount}` : 'retrying...'})`;
      default:
        return "❌ Tidak terhubung";
    }
  };

  // ====== CEK USER LOGIN ======
  useEffect(() => {
    const token = sessionStorage.getItem("chat-app-token");
    const userData = sessionStorage.getItem("chat-user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    
    const userObj = JSON.parse(userData);
    setUser(userObj);
  }, [router]);

  // ====== SOCKET EVENT HANDLERS ======
  useEffect(() => {
    if (!socket) return;

    // Event untuk menerima pesan baru
    const handleNewMessage = (messageData) => {
      console.log("📩 Pesan baru diterima:", messageData);
      setMessages(prev => {
        // Cek jika pesan sudah ada (hindari duplikasi)
        const messageExists = prev.some(msg => msg._id === messageData._id);
        if (messageExists) return prev;
        
        return [...prev, messageData];
      });
    };

    // Event untuk menerima semua pesan saat pertama connect
    const handleAllMessages = (messagesData) => {
      console.log("📨 Semua pesan diterima:", messagesData);
      setMessages(messagesData || []);
    };

    // Event untuk menerima pesan yang dihapus
    const handleDeleteMessage = (messageId) => {
      console.log("🗑️ Pesan dihapus:", messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    };

    // Event untuk menerima pesan yang diupdate
    const handleUpdateMessage = (updatedMessage) => {
      console.log("✏️ Pesan diupdate:", updatedMessage);
      setMessages(prev => prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      ));
    };

    // Event untuk menerima daftar pengguna online
    const handleOnlineUsers = (users) => {
      console.log("👥 Pengguna online:", users);
      setOnlineUsers(users || []);
    };

    // Event untuk konfirmasi pesan terkirim
    const handleMessageSent = (messageData) => {
      console.log("✅ Pesan terkirim:", messageData);
      setIsSending(false);
      
      // Update pesan lokal dengan data dari server
      setMessages(prev => prev.map(msg => 
        msg.tempId === messageData.tempId ? { ...messageData, status: 'delivered' } : msg
      ));
    };

    // Event untuk ping response
    const handlePong = (data) => {
      console.log("🏓 Pong received:", data);
    };

    // Daftarkan event listeners
    socket.on('newMessage', handleNewMessage);
    socket.on('allMessages', handleAllMessages);
    socket.on('messageDeleted', handleDeleteMessage);
    socket.on('messageUpdated', handleUpdateMessage);
    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('messageSent', handleMessageSent);
    socket.on('pong', handlePong);

    // Request semua pesan setelah terhubung
    if (isConnected) {
      socket.emit('getAllMessages');
      setRetryCount(0); // Reset retry count on successful connection
    }

    // Join room berdasarkan user ID setelah terhubung
    if (isConnected && user) {
      socket.emit('joinRoom', { 
        userId: user.id, 
        username: user.username,
        displayName: user.displayName 
      });
    }

    // Handle connection errors
    if (hasError) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 5000);
      
      return () => clearTimeout(timer);
    }

    // Cleanup event listeners
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('allMessages', handleAllMessages);
      socket.off('messageDeleted', handleDeleteMessage);
      socket.off('messageUpdated', handleUpdateMessage);
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('messageSent', handleMessageSent);
      socket.off('pong', handlePong);
    };
  }, [socket, isConnected, user, hasError]);

  // ====== AUTO SCROLL KE PESAN TERBARU ======
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ====== MANUAL RECONNECT ======
  const handleManualReconnect = () => {
    if (socket && !isConnected) {
      console.log("🔄 Manual reconnect attempt");
      socket.connect();
      setRetryCount(prev => prev + 1);
    }
  };

  // ====== KIRIM PESAN ======
  const handleSendMessage = async () => {
    if (message.trim() === "" || !socket) return;
    
    // Jika tidak terhubung, tampilkan pesan error
    if (!isConnected) {
      alert("Tidak terhubung ke server. Silakan coba lagi dalam beberapa saat.");
      return;
    }
    
    setIsSending(true);

    try {
      if (editMessageId) {
        // Edit pesan yang sudah ada
        const updatedMessage = {
          _id: editMessageId,
          text: message,
          senderId: user.id,
          senderName: user.displayName,
          updatedAt: new Date()
        };

        // Kirim ke server
        socket.emit('updateMessage', updatedMessage);
        setEditMessageId(null);
      } else {
        // Buat pesan baru dengan ID sementara
        const tempId = Date.now().toString();
        const newMessage = {
          tempId, // ID sementara sampai dikonfirmasi server
          text: message,
          senderId: user.id,
          senderName: user.displayName,
          createdAt: new Date(),
          status: 'sending'
        };

        // Tambahkan pesan ke UI langsung (optimistic update)
        setMessages(prev => [...prev, newMessage]);
        
        // Kirim ke server
        socket.emit('sendMessage', {
          text: message,
          senderId: user.id,
          senderName: user.displayName,
          tempId // Kirim tempId untuk matching nanti
        });
      }
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
    }
  };

  // ====== HAPUS PESAN ======
  const handleDeleteMessage = (id) => {
    if (confirm("Yakin mau hapus pesan ini?") && socket && isConnected) {
      // Kirim permintaan hapus ke server
      socket.emit('deleteMessage', id);
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
    if (socket) {
      socket.emit('leaveRoom', { userId: user?.id });
      socket.disconnect();
    }
    
    sessionStorage.removeItem("chat-app-token");
    sessionStorage.removeItem("chat-user");
    router.push("/login");
  };

  // ====== INDIKATOR STATUS KONEKSI ======
  const ConnectionIndicator = () => {
    let bgColor, icon;
    
    switch (connectionStatus) {
      case 'connected':
        bgColor = 'bg-green-600';
        icon = <FaWifi className="text-white" />;
        break;
      case 'connecting':
        bgColor = 'bg-yellow-600';
        icon = <FaSync className="text-white animate-spin" />;
        break;
      case 'error':
        bgColor = 'bg-red-600';
        icon = <FaExclamationTriangle className="text-white" />;
        break;
      default:
        bgColor = 'bg-gray-600';
        icon = <FaRegCircle className="text-white" />;
    }
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 ${bgColor} rounded-full flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm">{getStatusMessage()}</span>
        {hasError && (
          <button 
            onClick={handleManualReconnect}
            className="ml-2 p-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center gap-1"
          >
            <FaRedo size={10} /> Retry
          </button>
        )}
      </div>
    );
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
          <div className="p-2 rounded text-sm bg-gray-700">
            <ConnectionIndicator />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {isConnected 
              ? "Terhubung ke server. Pesan disinkronisasi secara real-time." 
              : "Menghubungkan ke server..."}
          </p>
        </div>

        <div className="flex-1 mb-4">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <FaUsers /> Pengguna Online ({onlineUsers.length})
          </h3>
          <div className="bg-gray-700 p-3 rounded max-h-60 overflow-y-auto">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((onlineUser, index) => (
                <div key={index} className="flex items-center mb-2 p-2 rounded hover:bg-gray-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>{onlineUser.displayName || onlineUser.username}</span>
                  {onlineUser.userId === user.id && <span className="ml-2 text-xs text-gray-400">(Anda)</span>}
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">
                {isConnected ? "Tidak ada pengguna online" : "Menunggu koneksi..."}
              </p>
            )}
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
            <p className="text-sm text-gray-600">
              {isConnected ? "Online Mode - Terhubung ke Server" : "Menghubungkan..."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        </header>

        {/* Connection Banner */}
        {hasError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaExclamationTriangle className="mr-2" />
                <p>Koneksi terputus. Sedang mencoba menghubungkan kembali...</p>
              </div>
              <button 
                onClick={handleManualReconnect}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
              >
                <FaRedo size={12} /> Coba Lagi
              </button>
            </div>
          </div>
        )}

        {/* Daftar Pesan */}
        <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center mt-10">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">Mulai percakapan pertama Anda!</p>
              <p className="text-gray-400 text-sm mt-2">
                {isConnected 
                  ? "Pesan akan dikirim dan diterima secara real-time" 
                  : "Menunggu koneksi ke server..."}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg._id || msg.tempId || index}
                className={`relative mb-4 p-3 rounded-lg max-w-md shadow-md transition-all duration-200 ${
                  msg.senderId === user.id
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-white text-gray-800 border"
                } ${msg.status === 'sending' ? 'opacity-70' : ''}`}
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
                    {msg.updatedAt && " (diedit)"}
                    {msg.status === 'sending' && " (mengirim...)"}
                  </span>
                </div>

                {/* Isi Pesan */}
                <p className="text-sm break-words">{msg.text}</p>

                {/* Status Pengiriman */}
                {msg.status === 'sending' && (
                  <div className="absolute -bottom-1 -right-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </div>
                )}

                {/* Tombol Edit & Hapus */}
                {msg.senderId === user.id && msg.status !== 'sending' && (
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
          <div ref={messagesEndRef} />
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
              disabled={isSending || !isConnected}
            />

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending || !isConnected}
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
          
          <div className={`flex items-center gap-2 mt-2 text-sm ${
            isConnected ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {isConnected ? <FaWifi /> : <FaExclamationTriangle />}
            <span>
              {isConnected 
                ? "Terhubung ke server - pesan dikirim secara real-time" 
                : "Menghubungkan ke server..."}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
