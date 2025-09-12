"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import {
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaPaperPlane,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaUsers,
} from "react-icons/fa";
import { logout } from "@/app/utils/auth";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId }) {
  const router = useRouter();
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
  const [theme, setTheme] = useState("light");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 🔧 Reset state tiap ganti channel
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

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [channelId]);

  // 🎛️ Setup socket
  useEffect(() => {
    if (!user || !channelId) return;

    const socket = io(SOCKET_URL, {
      query: { userId: user._id, channelId },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("getMessages", { channelId, page: 0 });

    socket.on("messages", (data) => {
      setMessages((prev) => [...data.reverse(), ...prev]);
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

    socket.on("typing", (u) => {
      if (u._id !== user._id) {
        setTypingUsers((prev) => {
          if (prev.find((x) => x._id === u._id)) return prev;
          return [...prev, u];
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((x) => x._id !== u._id));
        }, 3000);
      }
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, channelId]);

  // 🔽 Load older messages (infinite scroll)
  const loadMore = useCallback(() => {
    if (!socketRef.current || !hasMore) return;
    const nextPage = page + 1;
    socketRef.current.emit("getMessages", { channelId, page: nextPage });
    setPage(nextPage);
  }, [page, hasMore, channelId]);

  // ⌨️ Typing indicator
  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { channelId, user });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  // 📨 Kirim pesan
  const sendMessage = () => {
    if (!newMsg.trim() && !selectedImage) return;
    socketRef.current.emit("sendMessage", {
      channelId,
      text: newMsg,
      image: selectedImage,
    });
    setNewMsg("");
    setSelectedImage(null);
    setImagePreview(null);
  };

  // 📝 Edit pesan
  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };
  const saveEdit = (msgId) => {
    socketRef.current.emit("editMessage", {
      messageId: msgId,
      newText: editText,
    });
    setEditingId(null);
    setEditText("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // ❌ Delete pesan
  const deleteMessage = (msgId) => {
    socketRef.current.emit("deleteMessage", { messageId: msgId });
  };

  // 📷 Upload gambar
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div
      className={`flex flex-col h-screen ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 text-white">
        <h2 className="font-bold">Channel {channelId}</h2>
        <div className="flex space-x-3 items-center">
          <button onClick={toggleTheme}>
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </button>
          <div className="flex items-center space-x-1">
            <FaUsers />
            <span>{onlineUsers.length}</span>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasMore && (
          <button
            onClick={loadMore}
            className="mx-auto block px-3 py-1 text-sm bg-gray-300 rounded"
          >
            Load more
          </button>
        )}
        {isLoading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          messages.map((msg) => {
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
                  isOwn
                    ? "bg-blue-100 ml-auto text-right"
                    : "bg-white text-left"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    {msg.senderId?.username || "Unknown"}
                  </span>
                  {isOwn && (
                    <div className="flex space-x-2">
                      {editingId === msg._id ? (
                        <>
                          <button
                            onClick={() => saveEdit(msg._id)}
                            className="text-green-500"
                          >
                            <FaCheck />
                          </button>
                          <button onClick={cancelEdit} className="text-gray-500">
                            <FaTimes />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(msg)}
                            className="text-yellow-500"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className="text-red-500"
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
                    className="w-full border rounded p-1 mt-1"
                  />
                ) : (
                  <p className="mt-1">{msg.text}</p>
                )}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="uploaded"
                    className="mt-2 rounded max-h-48"
                  />
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

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-3 py-1 text-sm text-gray-500">
          {typingUsers.map((u) => u.username).join(", ")} sedang mengetik...
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-gray-200 flex space-x-2 items-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          id="fileInput"
        />
        <label
          htmlFor="fileInput"
          className="cursor-pointer px-3 py-2 bg-gray-400 text-white rounded"
        >
          📷
        </label>
        {imagePreview && (
          <div className="relative">
            <img
              src={imagePreview}
              alt="preview"
              className="w-16 h-16 object-cover rounded"
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
            >
              <FaTimes size={12} />
            </button>
          </div>
        )}
        <input
          type="text"
          value={editingId ? editText : newMsg}
          onChange={(e) =>
            editingId ? setEditText(e.target.value) : setNewMsg(e.target.value)
          }
          onKeyDown={handleTyping}
          placeholder="Ketik pesan..."
          className="flex-1 border p-2 rounded"
        />
        {editingId ? (
          <>
            <button
              onClick={() => saveEdit(editingId)}
              className="px-3 py-2 bg-green-500 text-white rounded"
            >
              <FaCheck />
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-2 bg-gray-500 text-white rounded"
            >
              <FaTimes />
            </button>
          </>
        ) : (
          <button
            onClick={sendMessage}
            className="px-3 py-2 bg-blue-500 text-white rounded"
          >
            <FaPaperPlane />
          </button>
        )}
      </div>
    </div>
  );
}
