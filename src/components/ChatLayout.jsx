"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("chat-app-token") },
    });

    socketRef.current.on("connect", () => console.log("✅ Connected to socket server"));

    socketRef.current.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    socketRef.current.on("editMessage", ({ id, text }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, text } : msg))
      );
    });

    socketRef.current.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    socketRef.current.on("onlineUsers", (users) => setOnlineUsers(users));

    socketRef.current.on("typing", (users) => setTypingUsers(users));

    socketRef.current.emit("getMessages");
    socketRef.current.on("initialMessages", (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => socketRef.current.disconnect();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendMessage = () => {
    if (!newMsg.trim()) return;
    const msg = { 
      text: newMsg, 
      userId: user.id, 
      username: user.name, 
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyTo,
    };
    socketRef.current.emit("sendMessage", msg);
    setNewMsg("");
    setReplyTo(null);
  };

  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = (id) => {
    socketRef.current.emit("editMessage", { id, text: editText });
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (id) => {
    socketRef.current.emit("deleteMessage", id);
  };
  
  const handleReply = (msg) => {
    setReplyTo(msg);
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (e.target.value) socketRef.current.emit("typing", user.name);
    else socketRef.current.emit("stopTyping", user.name);
  };

  // 🔹 Simulasi Kirim File/Gambar
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileMsg = {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: event.target.result,
          name: file.name,
          userId: user.id,
          username: user.name,
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        socketRef.current.emit("sendMessage", fileMsg);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar untuk user online */}
      <div className="w-1/4 bg-white p-4 border-r border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-blue-600">Online Users</h2>
        <ul>
          {onlineUsers.map((u) => (
            <li key={u} className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${u === user.id ? "bg-blue-100 font-bold text-blue-600" : "bg-gray-50"}`}>
              <div className={`w-3 h-3 rounded-full ${typingUsers.includes(u) ? "bg-green-500" : "bg-gray-400"}`}></div>
              {u}
              {typingUsers.includes(u) && <span className="text-sm text-green-500">typing...</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
          <h1 className="text-2xl font-bold">Rocket Chat</h1>
          <button onClick={logout} className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
            Logout
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((msg) => {
            const isOwn = msg.userId === user.id;
            const isFile = msg.type === 'image' || msg.type === 'file';
            const repliedTo = msg.replyTo;

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-lg p-3 rounded-2xl shadow-sm ${isOwn ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"}`}
                >
                  {/* Balasan Pesan */}
                  {repliedTo && (
                    <div className={`border-l-4 p-2 mb-2 rounded ${isOwn ? 'bg-blue-600 border-blue-400' : 'bg-gray-300 border-gray-400'}`}>
                      <p className="text-xs font-semibold mb-1">{repliedTo.username}</p>
                      <p className={`text-sm ${isOwn ? 'text-white/80' : 'text-gray-600'}`}>
                        {repliedTo.text}
                      </p>
                    </div>
                  )}

                  {/* Konten Pesan */}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold opacity-80 mb-1">{msg.username}</span>
                    {editingId === msg.id ? (
                      <div className="flex space-x-2">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 p-1 rounded border text-black"
                        />
                        <button onClick={() => saveEdit(msg.id)} className="bg-green-500 px-2 rounded text-white text-sm">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-400 px-2 rounded text-white text-sm">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {isFile ? (
                          <>
                            {msg.type === 'image' && (
                              <img src={msg.url} alt={msg.name} className="max-w-xs rounded-lg my-2" />
                            )}
                            <span className="text-sm font-semibold">{msg.name}</span>
                          </>
                        ) : (
                          <span className="text-base break-words">{msg.text}</span>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          {/* Waktu Pesan */}
                          <span className={`text-[10px] opacity-70 ${isOwn ? 'text-white' : 'text-gray-700'}`}>{msg.timestamp}</span>
                          
                          {/* Opsi pesan */}
                          <div className={`flex space-x-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button onClick={() => handleReply(msg)} className={`hover:text-yellow-200`}>
                              Reply
                            </button>
                            {isOwn && (
                              <>
                                <button onClick={() => handleEdit(msg)} className={`hover:text-yellow-200`}>
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(msg.id)} className={`hover:text-red-400`}>
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t border-gray-200 shadow-md">
          {/* Tampilan Balasan */}
          {replyTo && (
            <div className="flex justify-between items-center p-2 mb-2 bg-blue-100 rounded-lg border-l-4 border-blue-500">
              <span className="text-sm text-gray-700">Membalas {replyTo.username}: "{replyTo.text.substring(0, 30)}..."</span>
              <button onClick={() => setReplyTo(null)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              type="text"
              placeholder="Tulis pesan..."
              value={newMsg}
              onChange={handleTyping}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={sendMessage} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
