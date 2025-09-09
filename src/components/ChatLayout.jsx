"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";
import Image from "next/image";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Pastikan socket diinisialisasi sekali saja
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token: localStorage.getItem("chat-app-token") },
      });
    }

    const socket = socketRef.current;

    socket.on("connect", () => console.log("✅ Connected to socket server"));

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    socket.on("editMessage", ({ id, text }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, text } : msg))
      );
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    socket.on("onlineUsers", (users) => setOnlineUsers(users));
    socket.on("typing", (users) => setTypingUsers(users));

    socket.emit("getMessages");
    socket.on("initialMessages", (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendMessage = () => {
    if (!newMsg.trim() || !socketRef.current) return;
    const msg = { text: newMsg, userId: user.id, username: user.name, id: Date.now() };
    socketRef.current.emit("sendMessage", msg);
    setNewMsg("");
  };

  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = (id) => {
    if (!socketRef.current) return;
    socketRef.current.emit("editMessage", { id, text: editText });
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (id) => {
    if (!socketRef.current) return;
    socketRef.current.emit("deleteMessage", id);
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!socketRef.current) return;
    if (e.target.value) socketRef.current.emit("typing", user.name);
    else socketRef.current.emit("stopTyping", user.name);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowOnlineUsers(!showOnlineUsers)} className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.316a.75.75 0 011.5 0v.684a.75.75 0 01-1.5 0V4.316zM4.316 12a.75.75 0 010-1.5h.684a.75.75 0 010 1.5H4.316zM12 19.684a.75.75 0 01-1.5 0v-.684a.75.75 0 011.5 0v.684zM19.684 12a.75.75 0 010-1.5h-.684a.75.75 0 010 1.5h.684zM16.92 7.08a.75.75 0 01-1.06-1.06l.488-.488a.75.75 0 011.06 1.06l-.488.488zM6.488 17.52a.75.75 0 01-1.06-1.06l.488-.488a.75.75 0 011.06 1.06l-.488.488zM17.52 6.488a.75.75 0 01-1.06 1.06l-.488.488a.75.75 0 011.06-1.06l.488-.488zM7.08 16.92a.75.75 0 01-1.06 1.06l-.488-.488a.75.75 0 011.06-1.06l.488.488z" />
            </svg>
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">{onlineUsers.length}</span>
          </button>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors">
            Logout
          </button>
        </div>
        {showOnlineUsers && (
          <div className="absolute top-16 right-4 bg-white text-gray-800 p-4 rounded-lg shadow-xl z-10 w-64">
            <h3 className="font-bold mb-2">Online Users</h3>
            <ul>
              {onlineUsers.map((u) => (
                <li key={u} className={`mb-1 ${u === user.id ? "font-bold text-blue-600" : ""}`}>
                  {u} {typingUsers.includes(u) && <span className="text-sm text-green-500">typing...</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map((msg) => {
          const isOwn = msg.userId === user.id;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-lg p-3 rounded-2xl shadow-sm ${isOwn ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"}`}
              >
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
                  <div>
                    <span className="text-xs font-bold opacity-80 mb-1">{msg.username}</span>
                    <span className="block text-base">{msg.text}</span>
                    <div className={`flex space-x-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {/* Hanya user pemilik pesan yang bisa menghapus dan mengedit */}
                      {isOwn && (
                        <>
                          <button onClick={() => handleEdit(msg)} className="text-yellow-200 hover:text-yellow-400 text-xs">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:text-red-600 text-xs">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input area */}
      <div className="flex p-4 space-x-2 border-t border-gray-300 bg-white">
        <input
          type="text"
          placeholder="Tulis pesan..."
          value={newMsg}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Kirim
        </button>
      </div>
    </div>
  );
}
