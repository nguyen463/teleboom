"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user?.token) return;

    const socket = io(SOCKET_URL, { 
      auth: { token: user.token },
      // Tambahkan opsi reconnection untuk handling koneksi
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    // Handler untuk event 'onlineUsers' dengan validasi data
    const handleOnlineUsers = (data) => {
      if (Array.isArray(data)) {
        setOnlineUsers(data);
      } else {
        console.error("Data onlineUsers bukan array:", data);
        setOnlineUsers([]);
      }
    };

    // Handler untuk event 'userTyping' dengan validasi data
    const handleUserTyping = (userData) => {
      if (userData && typeof userData === 'object') {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== userData.userId), userData]);
      }
    };

    // Handler untuk event 'userStoppedTyping' dengan validasi data
    const handleUserStoppedTyping = (userData) => {
      if (userData && typeof userData === 'object') {
        setTypingUsers(prev => prev.filter(u => u.userId !== userData.userId));
      }
    };

    socket.on("allMessages", setMessages);
    socket.on("newMessage", msg => setMessages(prev => [...prev, msg]));
    socket.on("editMessage", updatedMsg => {
      setMessages(prev => prev.map(m => m._id === updatedMsg.id ? {...m, text: updatedMsg.text, updatedAt: updatedMsg.updatedAt} : m));
    });
    socket.on("deleteMessage", id => setMessages(prev => prev.filter(m => m._id !== id)));
    socket.on("onlineUsers", handleOnlineUsers); // Gunakan handler yang sudah divalidasi
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    // Handle error koneksi
    socket.on("connect_error", (err) => {
      console.error("Koneksi error:", err.message);
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!newMsg.trim() || !socketRef.current) return;
    socketRef.current.emit("sendMessage", { text: newMsg.trim() });
    setNewMsg("");
    socketRef.current.emit("stopTyping");
  };

  const startTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing");
  };

  const stopTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("stopTyping");
  };

  const handleEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  const saveEdit = () => {
    if (!editText.trim() || !socketRef.current || !editingId) return;
    socketRef.current.emit("editMessage", { id: editingId, text: editText.trim() });
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (id) => {
    if (!socketRef.current) return;
    if (!window.confirm("Hapus pesan ini?")) return;
    socketRef.current.emit("deleteMessage", id);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <div key={msg._id} className={`${msg.senderId === user.id ? "text-right" : ""} mb-2`}>
            <div className="text-xs">{msg.senderName} {msg.updatedAt && "(diedit)"}</div>
            {editingId === msg._id ? (
              <div className="flex items-center space-x-2">
                <input 
                  value={editText} 
                  onChange={e => setEditText(e.target.value)}
                  className="border p-1 rounded flex-1"
                />
                <button 
                  onClick={saveEdit}
                  className="bg-green-500 text-white px-2 rounded"
                >
                  Simpan
                </button>
              </div>
            ) : (
              <div className="bg-gray-100 p-2 rounded">{msg.text}</div>
            )}
            {msg.senderId === user.id && editingId !== msg._id && (
              <div className="space-x-2 mt-1">
                <button 
                  onClick={() => handleEdit(msg)}
                  className="text-blue-500 text-xs"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(msg._id)}
                  className="text-red-500 text-xs"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="p-4 flex space-x-2 border-t">
        <input
          type="text"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { 
            if(e.key === "Enter") sendMessage(); 
            else startTyping(); 
          }}
          onBlur={stopTyping}
          placeholder="Tulis pesan..."
          className="flex-1 border p-2 rounded"
        />
        <button 
          onClick={sendMessage} 
          className="bg-blue-500 text-white px-4 rounded"
        >
          Kirim
        </button>
      </div>

      <div className="p-2 text-sm text-gray-500">
        Online: {Array.isArray(onlineUsers) ? onlineUsers.map(u => u.displayName).join(", ") : "Error loading users"}
      </div>
      {typingUsers.length > 0 && (
        <div className="p-2 text-sm text-gray-500">
          {typingUsers.map(u => u.displayName).join(", ")} sedang mengetik...
        </div>
      )}
    </div>
  );
}
