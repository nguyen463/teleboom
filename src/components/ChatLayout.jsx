"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

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
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("chat-app-token");
    if (!token) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"]
      });
    }

    const socket = socketRef.current;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      socket.emit("getMessages");
    });

    socket.on("disconnect", () => setConnectionStatus("disconnected"));
    socket.on("connect_error", () => setConnectionStatus("error"));

    socket.on("allMessages", (msgs) => {
      const formatted = msgs.map(m => ({
        ...m,
        _id: m._id ? m._id.toString() : Math.random().toString(),
        senderId: m.senderId ? m.senderId.toString() : ""
      }));
      setMessages(formatted);
    });

    socket.on("newMessage", (msg) => {
      setMessages(prev => [...prev, {
        ...msg,
        _id: msg._id ? msg._id.toString() : Math.random().toString(),
        senderId: msg.senderId ? msg.senderId.toString() : ""
      }]);
    });

    socket.on("editMessage", ({ id, text, updatedAt }) => {
      setMessages(prev => prev.map(m => m._id === id ? { ...m, text, updatedAt } : m));
    });

    socket.on("deleteMessage", (id) => {
      setMessages(prev => prev.filter(m => m._id !== id.toString()));
    });

    socket.on("onlineUsers", setOnlineUsers);
    socket.on("userTyping", (u) => {
      setTypingUsers(prev => prev.some(p => p.userId === u.userId) ? prev : [...prev, u]);
    });
    socket.on("userStoppedTyping", (u) => {
      setTypingUsers(prev => prev.filter(p => p.userId !== u.userId));
    });

    return () => {
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if ((!newMsg.trim() && !selectedImage) || !socketRef.current?.connected) return;

    setIsUploading(true);

    const send = (imageData = null) => {
      const messageData = {
        text: newMsg.trim(),
        image: imageData,
        senderId: user.id,
        senderName: user.name
      };
      socketRef.current.emit("sendMessage", messageData);
      setNewMsg("");
      setSelectedImage(null);
      setImagePreview(null);
      socketRef.current.emit("stopTyping");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsUploading(false);
    };

    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = (e) => send(e.target.result);
      reader.readAsDataURL(selectedImage);
    } else send();
  };

  const handleEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit("editMessage", { id: editingId, text: editText.trim(), userId: user.id });
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (id) => {
    if (!socketRef.current?.connected) return;
    if (!confirm("Hapus pesan ini?")) return;
    socketRef.current.emit("deleteMessage", id.toString(), { userId: user.id });
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMsg(value);
    if (!socketRef.current?.connected) return;

    if (value) {
      socketRef.current.emit("typing");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socketRef.current.emit("stopTyping"), 3000);
    } else {
      socketRef.current.emit("stopTyping");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.match("image.*") || file.size > 5 * 1024 * 1024) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { setEditingId(null); setEditText(""); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowOnlineUsers(!showOnlineUsers)} className="relative p-2 rounded-full hover:bg-blue-700">
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-green-600 rounded-full">
              {onlineUsers.length}
            </span>
          </button>
          <span className="hidden md:inline">Hai, {user?.name}</span>
          <span className={`h-3 w-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">Logout</button>
        </div>
      </div>

      {/* Online Users */}
      {showOnlineUsers && (
        <div className="bg-white border-b shadow-sm p-4">
          <h3 className="font-bold text-gray-700 mb-2">Online Users ({onlineUsers.length})</h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map(u => (
              <div key={u.userId} className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                <span className={`text-sm ${u.userId === user.id ? "font-bold text-blue-600" : "text-gray-700"}`}>
                  {u.displayName || u.username}
                  {typingUsers.some(t => t.userId === u.userId) && <span className="text-xs text-green-500"> (mengetik...)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">Belum ada pesan. Mulai percakapan!</div>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === user.id.toString();
          return (
            <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg p-3 rounded-2xl shadow-sm ${isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-900 border"}`}>
                {editingId === msg._id ? (
                  <div className="flex flex-col space-y-2">
                    <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={handleEditKeyPress} className="flex-1 p-2 rounded border text-black" autoFocus/>
                    <div className="flex space-x-2 self-end">
                      <button onClick={saveEdit} className="bg-green-500 px-3 py-1 rounded text-white text-sm">Simpan</button>
                      <button onClick={() => { setEditingId(null); setEditText(""); }} className="bg-gray-400 px-3 py-1 rounded text-white text-sm">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold opacity-80">{msg.senderName}</span>
                      <span className="text-xs opacity-70">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}{msg.updatedAt && ' (diedit)'}</span>
                    </div>
                    {msg.image && <img src={msg.image} alt="Gambar pesan" className="max-w-full rounded-lg max-h-64 object-cover my-2"/>}
                    {msg.text && <span className="block text-base">{msg.text}</span>}
                    {isOwn && (
                      <div className="flex space-x-2 mt-1 justify-end">
                        <button onClick={() => handleEdit(msg)} className="text-xs text-blue-100 hover:text-blue-300">Edit</button>
                        <button onClick={() => handleDelete(msg._id)} className="text-xs text-red-300 hover:text-red-500">Hapus</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="bg-gray-100 border-t p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={imagePreview} alt="Preview" className="h-12 w-12 object-cover rounded"/>
            <span className="text-sm text-gray-600">Gambar terpilih</span>
          </div>
          <button onClick={removeImage} className="text-red-500 hover:text-red-700">X</button>
        </div>
      )}

      {/* Input area */}
      <div className="flex flex-col p-4 space-y-2 border-t border-gray-300 bg-white">
        <div className="flex space-x-2">
          <input type="text" placeholder="Tulis pesan..." value={newMsg} onChange={handleTyping} onKeyDown={e => { if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); }}} className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <button onClick={sendMessage} disabled={(!newMsg.trim() && !selectedImage) || isUploading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isUploading ? <span className="animate-spin">⏳</span> : "Kirim"}
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <label htmlFor="image-upload" className="cursor-pointer text-gray-600 hover:text-blue-600 transition-colors">📷
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" ref={fileInputRef}/>
          </label>
          <span className="text-sm text-gray-500">Tekan Enter untuk mengirim, Shift+Enter untuk baris baru</span>
        </div>
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && <div className="bg-white border-t px-4 py-2 text-sm text-gray-500">{typingUsers.map(u => u.displayName || u.username).join(", ")} {typingUsers.length === 1 ? "sedang mengetik..." : "sedang mengetik..."}</div>}
    </div>
  );
}
