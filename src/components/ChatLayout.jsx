"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import io from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId, logout }) {
  // States (tetap sama)
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const router = useRouter();

  // Normalisasi data pesan (tetap sama)
  const normalizeMessage = useCallback(
    (msg) => ({
      ...msg,
      _id: msg._id?.toString() || Math.random().toString(),
      senderId: msg.senderId?.toString() || "",
      channelId: msg.channelId?.toString() || "",
    }),
    []
  );

  // Gulir ke pesan terbaru (tetap sama)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Inisialisasi socket dan penanganan event (tetap sama)
  useEffect(() => {
    // ... (kode tetap sama)
  }, [user, channelId, router, normalizeMessage, logout, scrollToBottom]);

  // Infinite scroll (tetap sama)
  useEffect(() => {
    // ... (kode tetap sama)
  }, [hasMore, isLoading, page, channelId, normalizeMessage]);

  // Fungsi kirim pesan (tetap sama)
  const sendMessage = useCallback(() => {
    // ... (kode tetap sama)
  }, [newMsg, selectedImage, isUploading, channelId]);

  // Fungsi handle typing (tetap sama)
  const handleTyping = useCallback(
    (e) => {
      // ... (kode tetap sama)
    },
    [channelId]
  );

  // Fungsi handle image select (tetap sama)
  const handleImageSelect = (e) => {
    // ... (kode tetap sama)
  };

  // Fungsi handle edit (tetap sama)
  const handleEdit = (msg) => {
    // ... (kode tetap sama)
  };

  // Fungsi save edit (tetap sama)
  const saveEdit = useCallback(() => {
    // ... (kode tetap sama)
  }, [editingId, editText, channelId]);

  // Fungsi handle delete (tetap sama)
  const handleDelete = useCallback(
    (id) => {
      // ... (kode tetap sama)
    },
    []
  );

  // Tampilkan status koneksi dengan warna yang sesuai
  const connectionStatusColor = {
    connecting: "text-yellow-500",
    connected: "text-green-500",
    disconnected: "text-red-500",
    error: "text-red-500"
  };

  if (!channelId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center p-6 bg-card rounded-lg shadow-md">
          <div className="text-xl font-semibold mb-2">Channel tidak valid</div>
          <p className="text-muted-foreground">Mengalihkan ke halaman channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
      />
      
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-foreground/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-1.003-.21-1.96-.59-2.808A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="font-semibold hidden md:inline">Hai, {user?.displayName || user?.username}</span>
            <span className={`text-sm ml-2 ${connectionStatusColor[connectionStatus]}`}>
              ({connectionStatus})
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Toggle Online Users */}
          <button
            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
            title={showOnlineUsers ? "Sembunyikan pengguna online" : "Tampilkan pengguna online"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card text-card-foreground rounded-md shadow-lg border border-border z-10">
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Online Users Panel */}
      {showOnlineUsers && (
        <div className="bg-secondary text-secondary-foreground p-4 shadow-sm">
          <h3 className="font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Pengguna Online ({onlineUsers.length})
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {onlineUsers.map((u) => (
              <span key={u.userId} className="bg-primary/20 text-xs px-3 py-1 rounded-full">
                {u.displayName || u.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive-foreground p-3 text-center flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-background"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 text-muted-foreground">Memuat pesan...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-lg">Belum ada pesan di channel ini</p>
              <p className="mt-1">Mulai percakapan dengan mengirim pesan pertama!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = user?.id && msg.senderId && msg.senderId.toString() === user.id.toString();
            return (
              <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md p-4 rounded-2xl shadow-sm ${
                    isOwn 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold">{msg.senderName}</span>
                    <span className="text-xs opacity-80">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("id-ID") : ""}
                      {msg.updatedAt && " (diedit)"}
                    </span>
                  </div>
                  
                  {msg.image && (
                    <div className="my-2">
                      <img
                        src={msg.image}
                        alt="Gambar pesan"
                        className="max-w-full rounded-lg max-h-64 object-cover"
                      />
                    </div>
                  )}
                  
                  {msg.text && <div className="text-base break-words">{msg.text}</div>}
                  
                  {editingId === msg._id ? (
                    <div className="flex flex-col space-y-2 mt-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit();
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                            setEditText("");
                          }
                        }}
                        className="flex-1 p-2 rounded border bg-background text-foreground"
                        autoFocus
                      />
                      <div className="flex space-x-2 self-end">
                        <button
                          onClick={saveEdit}
                          className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white text-sm transition-colors"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                          className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-white text-sm transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    isOwn && (
                      <div className="flex space-x-2 mt-2 justify-end">
                        <button
                          onClick={() => handleEdit(msg)}
                          className="text-xs opacity-80 hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="text-xs opacity-80 hover:opacity-100 transition-opacity text-red-300"
                        >
                          Hapus
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="p-4 bg-secondary border-t border-border">
          <div className="flex items-center space-x-3">
            <img src={imagePreview} alt="Pratinjau" className="h-16 w-16 rounded-lg object-cover" />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-secondary text-sm text-muted-foreground flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {typingUsers.map((u) => u.displayName || u.username).join(", ")} sedang mengetik...
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-secondary border-t border-border">
        <div className="flex space-x-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors flex-shrink-0"
            disabled={isUploading}
            title="Unggah gambar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          
          <input
            type="text"
            value={newMsg}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-3 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ketik pesan..."
            disabled={isUploading}
          />
          
          <button
            onClick={sendMessage}
            disabled={isUploading || (!newMsg.trim() && !selectedImage)}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Kirim pesan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
