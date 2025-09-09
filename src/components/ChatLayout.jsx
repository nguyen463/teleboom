"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";
import { FaTrash, FaEdit } from "react-icons/fa";

export default function ChatLayout() {
  const router = useRouter();
  const socket = useSocket();

  const [status, setStatus] = useState("Menghubungkan...");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ===== SOCKET.IO =====
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      setStatus("✅ Terhubung ke server!");
      setUserId(socket.id);
    });

    socket.on("disconnect", () => {
      setStatus("❌ Terputus dari server.");
    });

    socket.on("load_messages", (allMessages) => {
      setMessages(allMessages);
      scrollToBottom();
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    socket.on("message_deleted", (id) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    });

    socket.on("message_updated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    });

    socket.on("online_users", (users) => setOnlineUsers(users));

    socket.on("typing", (typingUser) => {
      if (typingUser !== userId) {
        setTypingUsers((prev) => [...new Set([...prev, typingUser])]);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== typingUser));
        }, 1000);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
      socket.off("load_messages");
      socket.off("message_deleted");
      socket.off("message_updated");
      socket.off("online_users");
      socket.off("typing");
    };
  }, [socket, userId]);

  // ===== SCROLL OTOMATIS =====
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // ===== KIRIM PESAN =====
  const handleSendMessage = () => {
    if (!message.trim()) return;

    if (editMessageId) {
      socket.emit("edit_message", { id: editMessageId, text: message });
      setEditMessageId(null);
    } else {
      socket.emit("chat_message", { text: message, id: socket.id });
    }

    setMessage("");
  };

  // ===== TOMBOL DELETE =====
  const handleDeleteMessage = (id) => {
    if (!id) return;
    if (confirm("Yakin mau hapus pesan ini?")) {
      socket.emit("delete_message", id);
    }
  };

  // ===== EDIT PESAN =====
  const handleEditMessage = (msg) => {
    if (!msg?.id) return;
    setMessage(msg.text);
    setEditMessageId(msg.id);
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

  // ===== MENGETIK =====
  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket?.emit("typing", socket.id);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 text-white p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Users Online</h2>
        <p className="text-gray-400 mb-4">Status: {status}</p>
        <ul className="space-y-2 flex-1 overflow-y-auto">
          {onlineUsers.length === 0 ? (
            <li className="text-gray-400">Tidak ada user online</li>
          ) : (
            onlineUsers.map((u) => (
              <li key={u} className="text-sm">
                {u === userId ? "Anda (Anda sendiri)" : u.slice(0, 5)}
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Area Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">💬 Chat Room</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        {/* Daftar Pesan */}
        <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 && (
            <p className="text-gray-500 text-center mt-4">
              Kirim pesan pertama Anda!
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.id === userId;
            return (
              <div
                key={msg.id}
                className={`relative mb-3 p-3 rounded-lg max-w-xs shadow-md ${
                  isOwn ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-gray-800"
                }`}
              >
                <p className="text-sm">
                  <span className="font-semibold">
                    {isOwn ? "Anda" : msg.id.slice(0, 5)}
                  </span>
                  : {msg.text}
                </p>

                {isOwn && (
                  <div className="absolute -top-2 -right-10 flex gap-2">
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="text-yellow-400 hover:text-yellow-600"
                      title="Edit pesan"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Hapus pesan"
                    >
                      <FaTrash size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {typingUsers.length > 0 && (
            <p className="text-sm text-gray-500 italic">
              {typingUsers.map((u) => (u === userId ? "Anda" : u.slice(0, 5))).join(", ")} sedang mengetik...
            </p>
          )}
          <div ref={messagesEndRef}></div>
        </main>

        {/* Input */}
        <footer className="bg-white p-4 border-t flex gap-2">
          <input
            type="text"
            placeholder={editMessageId ? "Edit pesan..." : "Ketik pesan..."}
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {editMessageId ? "Update" : "Send"}
          </button>
        </footer>
      </div>
    </div>
  );
}
