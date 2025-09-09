"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";
import Image from "next/image";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function ChatLayout({ user }) {
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

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Inisialisasi socket dengan token yang benar
    const token = localStorage.getItem("chat-app-token");
    if (!token) {
      console.error("No token found");
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: {
          token: token
        }
      });
    }

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Connected to socket server");
      // Request messages setelah terkoneksi
      socket.emit("getMessages");
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
    });

    // Event listeners untuk pesan
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("editMessage", ({ id, text }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, text } : msg))
      );
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("userTyping", (users) => {
      setTypingUsers(users);
    });

    socket.on("initialMessages", (msgs) => {
      setMessages(msgs);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Scroll ke bawah ketika messages berubah
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = () => {
    if ((!newMsg.trim() && !selectedImage) || !socketRef.current) return;
    
    const messageData = {
      text: newMsg.trim(),
      userId: user.id,
      username: user.name,
      timestamp: new Date().toISOString(),
      image: selectedImage
    };
    
    socketRef.current.emit("sendMessage", messageData);
    setNewMsg("");
    setSelectedImage(null);
    setImagePreview(null);
    
    // Menghentikan status typing
    socketRef.current.emit("stopTyping", user.name);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = (id) => {
    if (!socketRef.current || !editText.trim()) return;
    socketRef.current.emit("editMessage", { id, text: editText.trim() });
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (id) => {
    if (!socketRef.current) return;
    socketRef.current.emit("deleteMessage", id);
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMsg(value);
    
    if (!socketRef.current) return;
    
    // Mengirim status typing
    if (value) {
      socketRef.current.emit("typing", user.name);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout untuk menghentikan status typing
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("stopTyping", user.name);
      }, 1000);
    } else {
      socketRef.current.emit("stopTyping", user.name);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      alert('Hanya file gambar yang diizinkan');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }
    
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowOnlineUsers(!showOnlineUsers)} 
            className="relative p-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-green-600 rounded-full">
              {onlineUsers.length}
            </span>
          </button>
          <span className="hidden md:inline">Hai, {user.name}</span>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors">
            Logout
          </button>
        </div>
      </div>

      {/* Online Users Panel */}
      {showOnlineUsers && (
        <div className="bg-white border-b shadow-sm p-4">
          <h3 className="font-bold text-gray-700 mb-2">Online Users ({onlineUsers.length})</h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((username) => (
              <div key={username} className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                <span className={`text-sm ${username === user.name ? "font-bold text-blue-600" : "text-gray-700"}`}>
                  {username} {typingUsers.includes(username) && <span className="text-xs text-green-500">(mengetik...)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>Belum ada pesan. Mulai percakapan!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === user.id;
            return (
              <div key={msg.id || msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-lg p-3 rounded-2xl shadow-sm ${isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-900 border"}`}
                >
                  {editingId === (msg.id || msg._id) ? (
                    <div className="flex flex-col space-y-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 p-2 rounded border text-black"
                        autoFocus
                      />
                      <div className="flex space-x-2 self-end">
                        <button onClick={() => saveEdit(msg.id || msg._id)} className="bg-green-500 px-3 py-1 rounded text-white text-sm">
                          Simpan
                        </button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-400 px-3 py-1 rounded text-white text-sm">
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold opacity-80">{msg.username}</span>
                        <span className="text-xs opacity-70">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      
                      {msg.image ? (
                        <div className="my-2">
                          <img 
                            src={msg.image} 
                            alt="Gambar pesan" 
                            className="max-w-full rounded-lg max-h-64 object-cover"
                          />
                        </div>
                      ) : null}
                      
                      {msg.text && <span className="block text-base">{msg.text}</span>}
                      
                      <div className={`flex space-x-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {isOwn && (
                          <>
                            <button 
                              onClick={() => handleEdit(msg)} 
                              className="text-xs text-blue-100 hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(msg.id || msg._id)} 
                              className="text-xs text-red-300 hover:text-red-500 transition-colors"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
        <div className="bg-gray-100 border-t p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={imagePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
            <span className="text-sm text-gray-600">Gambar terpilih</span>
          </div>
          <button 
            onClick={removeImage}
            className="text-red-500 hover:text-red-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex flex-col p-4 space-y-2 border-t border-gray-300 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Tulis pesan..."
            value={newMsg}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={sendMessage} 
            disabled={(!newMsg.trim() && !selectedImage) || isUploading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Kirim'
            )}
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <label htmlFor="image-upload" className="cursor-pointer text-gray-600 hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              ref={fileInputRef}
            />
          </label>
          
          <span className="text-sm text-gray-500">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </span>
        </div>
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="bg-white border-t px-4 py-2 text-sm text-gray-500">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "sedang mengetik..." : "sedang mengetik..."}
        </div>
      )}
    </div>
  );
}
