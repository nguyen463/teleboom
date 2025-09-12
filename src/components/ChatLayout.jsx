"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";
import { FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import { logout } from "@/app/utils/auth";

export default function ChatLayout({ user, channelId }) {
  const router = useRouter();
  const socket = useSocket();

  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // 🔹 Reset state saat channel berubah
  useEffect(() => {
    setMessages([]);
    setPage(0);
    setHasMore(true);
    setNewMsg("");
    setEditingId(null);
    setEditText("");
    setSelectedImage(null);
    setImagePreview(null);
    setTypingUsers([]);
    setError(null);
    setIsLoading(true);
  }, [channelId]);

  // 🔹 Load messages
  useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("getMessages", { channelId, page });

    socket.on("messages", (data) => {
      setMessages((prev) => [...data, ...prev]);
      setHasMore(data.length > 0);
      setIsLoading(false);
    });

    socket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("messageEdited", (msg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? msg : m))
      );
    });

    socket.on("messageDeleted", (msgId) => {
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    });

    return () => {
      socket.off("messages");
      socket.off("newMessage");
      socket.off("messageEdited");
      socket.off("messageDeleted");
    };
  }, [socket, channelId, page]);

  // 🔹 Scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 🔹 Kirim pesan
  const sendMessage = () => {
    if (!newMsg.trim() || !socket) return;
    socket.emit("sendMessage", { channelId, text: newMsg });
    setNewMsg("");
  };

  // 🔹 Mulai edit pesan
  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  // 🔹 Simpan edit pesan
  const saveEdit = (msgId) => {
    if (!socket) return;
    socket.emit("editMessage", { messageId: msgId, newText: editText });
    setEditingId(null);
    setEditText("");
  };

  // 🔹 Batal edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // 🔹 Hapus pesan
  const deleteMessage = (msgId) => {
    if (!socket) return;
    socket.emit("deleteMessage", { messageId: msgId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800 text-white">
        <h2 className="font-bold">Channel {channelId}</h2>
        <button
          className="text-red-400 hover:text-red-600"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          Logout
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">Belum ada pesan</p>
        ) : (
          messages.map((msg) => {
            // ✅ Fix check ownership (senderId bisa object atau string)
            const userId = user?._id || user?.id;
            const senderId =
              (msg.senderId && typeof msg.senderId === "object"
                ? msg.senderId._id
                : msg.senderId) || "";
            const isOwn =
              userId && senderId && senderId.toString() === userId.toString();

            return (
              <div
                key={msg._id}
                className={`p-2 rounded-lg ${
                  isOwn ? "bg-blue-100 ml-auto" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    {msg.senderId?.username || "Unknown"}
                  </span>
                  {isOwn && (
                    <div className="flex space-x-2">
                      {editingId === msg._id ? (
                        <>
                          <button
                            onClick={() => saveEdit(msg._id)}
                            className="text-green-500 hover:text-green-700"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <FaTimes />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(msg)}
                            className="text-yellow-500 hover:text-yellow-700"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {editingId === msg._id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="border p-1 rounded w-full mt-1"
                  />
                ) : (
                  <p className="mt-1">{msg.text}</p>
                )}
                {msg.isEdited && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 bg-white flex space-x-2">
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 rounded hover:bg-blue-600"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}
