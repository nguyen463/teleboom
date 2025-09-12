"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId, logout }) {
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
  const [theme, setTheme] = useState("light");
  const [forceUpdate, setForceUpdate] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const router = useRouter();

  // === Reset state setiap kali ganti channel ===
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

  // === Normalisasi message biar id aman string ===
  const normalizeMessage = useCallback((msg) => {
    if (!msg) return null;
    try {
      let senderIdStr = "";
      let senderName = "Unknown";

      if (msg.senderId) {
        if (typeof msg.senderId === "object" && msg.senderId._id) {
          senderIdStr = msg.senderId._id.toString();
          senderName =
            msg.senderId.displayName || msg.senderId.username || "Unknown";
        } else {
          senderIdStr = msg.senderId.toString();
          if (msg.senderName) senderName = msg.senderName;
        }
      }

      return {
        ...msg,
        _id: msg._id ? msg._id.toString() : Math.random().toString(),
        senderId: senderIdStr,
        senderName,
      };
    } catch (err) {
      console.error("normalizeMessage error:", err, msg);
      return null;
    }
  }, []);

  // === Edit pesan ===
  const handleEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text || "");
  };

  const saveEdit = useCallback(() => {
    if (!socketRef.current || !editText.trim() || !editingId) return;
    socketRef.current.emit(
      "editMessage",
      { id: editingId, text: editText, channelId },
      (res) => {
        if (res?.error) {
          toast.error(res.error);
        } else {
          setEditingId(null);
          setEditText("");
        }
      }
    );
  }, [editingId, editText, channelId]);

  // === Delete pesan ===
  const handleDelete = useCallback(
    (id) => {
      if (!socketRef.current) return;
      if (window.confirm("Yakin hapus pesan ini?")) {
        socketRef.current.emit("deleteMessage", { id, channelId }, (res) => {
          if (res?.error) {
            toast.error(res.error);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m._id === id ? { ...m, text: null, isDeleted: true } : m
              )
            );
          }
        });
      }
    },
    [channelId]
  );

  // === Socket listener untuk edit & delete ===
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    socket.on("editMessage", (msg) => {
      const n = normalizeMessage(msg);
      if (n) {
        setMessages((prev) =>
          prev.map((m) => (m._id === n._id ? { ...n, isEdited: true } : m))
        );
      }
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id.toString() ? { ...m, text: null, isDeleted: true } : m
        )
      );
    });

    return () => {
      socket.off("editMessage");
      socket.off("deleteMessage");
    };
  }, [normalizeMessage]);

  // === Render pesan ===
  const renderMessage = (msg) => {
    let isOwn = false;
    try {
      isOwn =
        user?.id &&
        msg.senderId &&
        msg.senderId.toString() === user.id.toString();
    } catch {
      isOwn = false;
    }

    return (
      <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-lg p-3 rounded-2xl shadow-sm border ${
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-black border-gray-300"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold opacity-80">
              {msg.senderName || (isOwn ? "You" : "Unknown")}
            </span>
            <span className="text-xs opacity-70">
              {msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString("id-ID")
                : ""}
              {msg.isEdited && " (edited)"}
            </span>
          </div>

          {msg.image && !msg.isDeleted && (
            <img
              src={msg.image}
              alt="msg"
              className="max-w-full rounded-lg max-h-64 object-cover my-2"
            />
          )}

          {msg.isDeleted ? (
            <i className="opacity-70 text-sm">Pesan dihapus</i>
          ) : editingId === msg._id ? (
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
                className="flex-1 p-2 rounded border bg-white text-black"
                autoFocus
              />
              <div className="flex space-x-2 self-end">
                <button
                  onClick={saveEdit}
                  className="bg-blue-600 px-3 py-1 rounded text-white text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditText("");
                  }}
                  className="bg-gray-400 px-3 py-1 rounded text-black text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            msg.text && <span className="block text-base">{msg.text}</span>
          )}

          {isOwn && !msg.isDeleted && editingId !== msg._id && (
            <div className="flex space-x-2 mt-3 justify-end">
              <button
                onClick={() => handleEdit(msg)}
                className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-gray-300 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(msg._id)}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // === Render semua pesan ===
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={messagesContainerRef}>
      {messages.length === 0 ? (
        <p className="text-center text-gray-500">Belum ada pesan</p>
      ) : (
        messages.map(renderMessage)
      )}
      <div ref={messagesEndRef}></div>
      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}
