"use client";

import { useEffect, useState } from "react";
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

  // ====== KONEKSI SOCKET.IO ======
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      setStatus("✅ Terhubung ke server!");
      setUserId(socket.id);
    });

    socket.on("disconnect", () => {
      setStatus("❌ Terputus dari server.");
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("load_messages", (allMessages) => {
      setMessages(allMessages);
    });

    socket.on("message_deleted", (id) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });

    socket.on("message_updated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
      socket.off("load_messages");
      socket.off("message_deleted");
      socket.off("message_updated");
    };
  }, [socket]);

  // ====== KIRIM PESAN ======
  const handleSendMessage = () => {
    if (message.trim() === "") return;

    if (editMessageId) {
      socket.emit("edit_message", { id: editMessageId, newText: message });
      setEditMessageId(null);
    } else {
      socket.emit("chat_message", { text: message, id: socket.id });
    }

    setMessage("");
  };

  // ====== HAPUS PESAN ======
  const handleDeleteMessage = (id) => {
    if (confirm("Yakin mau hapus pesan ini?")) {
      socket.emit("delete_message", id);
    }
  };

  // ====== EDIT PESAN ======
  const handleEditMessage = (msg) => {
    setMessage(msg.text);
    setEditMessageId(msg._id);
  };

  // ====== LOGOUT ======
  const handleLogout = () => {
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Users</h2>
        <p className="text-gray-400">Status: {status}</p>
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
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center mt-4">
              Kirim pesan pertama Anda!
            </p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`relative mb-3 p-3 rounded-lg max-w-xs shadow-md ${
                  msg.id === userId
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {/* Isi Pesan */}
                <p className="text-sm">
                  <span className="font-semibold">
                    {msg.id
                      ? msg.id === userId
                        ? "Anda"
                        : msg.id.slice(0, 5)
                      : "Anonim"}
                  </span>
                  : {msg.text}
                </p>

                {/* Tombol Edit & Hapus */}
                {msg.id === userId && (
                  <div className="absolute -top-2 -right-10 flex gap-2">
                    <button
                      onClick={() => handleEditMessage(msg)}
                      className="text-yellow-400 hover:text-yellow-600"
                      title="Edit pesan"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="text-red-500 hover:text-red-700"
                      title="Hapus pesan"
                    >
                      <FaTrash size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </main>

        {/* Input Pesan */}
        <footer className="bg-white p-4 border-t flex gap-2">
          <input
            type="text"
            placeholder={
              editMessageId ? "Edit pesan..." : "Ketik pesan..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Tombol Send */}
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

