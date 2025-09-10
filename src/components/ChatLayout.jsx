"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function ChatLayout({ user, channelId }) {
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
  const [showMenu, setShowMenu] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const router = useRouter();

  // Normalisasi data pesan
  const normalizeMessage = useCallback(
    (msg) => ({
      ...msg,
      _id: msg._id?.toString() || Math.random().toString(),
      senderId: msg.senderId?.toString() || "",
      channelId: msg.channelId?.toString() || "",
    }),
    []
  );

  // Inisialisasi socket
  const initializeSocket = useCallback(() => {
    if (!user?.token) {
      setError("Token autentikasi tidak ditemukan. Mengalihkan ke login...");
      setTimeout(() => router.push("/login"), 2000);
      return null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setError(null);
      console.log("🔍 Socket terhubung, ID:", socket.id);
      socket.emit("getMessages", { channelId, limit: 20, skip: 0 });
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");
      setError("Terputus dari server. Mencoba menyambungkan kembali...");
      console.log("🔍 Socket terputus:", reason);
    });

    socket.on("reconnect", () => {
      setConnectionStatus("connected");
      setError(null);
      console.log("🔍 Socket tersambung kembali");
      socket.emit("getMessages", { channelId, limit: 20, skip: 0 });
    });

    socket.on("connect_error", (err) => {
      setConnectionStatus("error");
      setError("Koneksi gagal: " + err.message);
      toast.error("Koneksi gagal: " + err.message);
      console.log("🔍 Socket connect_error:", err.message);
    });

    socket.on("allMessages", (msgs) => {
      const normalized = msgs
        .map(normalizeMessage)
        .filter((msg) => msg.channelId === channelId);
      setMessages((prev) =>
        page === 0 ? normalized.reverse() : [...normalized.reverse(), ...prev]
      );
      setHasMore(msgs.length === 20);
      console.log("🔍 Menerima allMessages:", normalized);
    });

    socket.on("newMessage", (msg) => {
      if (msg.channelId.toString() === channelId) {
        setMessages((prev) => [...prev, normalizeMessage(msg)]);
        console.log("🔍 Menerima newMessage:", msg);
      }
    });

    socket.on("editMessage", (msg) => {
      if (msg.channelId.toString() === channelId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg._id ? { ...m, text: msg.text, updatedAt: msg.updatedAt } : m
          )
        );
        setEditingId(null);
        setEditText("");
        console.log("🔍 Menerima editMessage:", msg);
      }
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
      console.log("🔍 Menerima deleteMessage:", id);
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
      console.log("🔍 Menerima onlineUsers:", users);
    });

    socket.on("userTyping", (userData) => {
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userData.userId)
          ? prev
          : [...prev, userData]
      );
      console.log("🔍 Menerima userTyping:", userData);
    });

    socket.on("userStoppedTyping", (userData) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userData.userId));
      console.log("🔍 Menerima userStoppedTyping:", userData);
    });

    socket.on("error", (errorMsg) => {
      setError(errorMsg);
      toast.error(`Error: ${errorMsg}`);
      console.log("🔍 Menerima error:", errorMsg);
      if (errorMsg.includes("autentikasi") || errorMsg.includes("token")) {
        setTimeout(() => router.push("/login"), 2000);
      }
    });

    return socket;
  }, [user, router, normalizeMessage, page, channelId]);

  // Inisialisasi socket dan validasi pengguna
  useEffect(() => {
    console.log("🔍 Objek pengguna:", user, "Channel ID:", channelId);
    if (!user || !user.id || !user.token || !channelId) {
      setError("Pengguna tidak terautentikasi atau channel tidak valid. Mengalihkan ke login...");
      setIsLoading(false);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    socketRef.current = initializeSocket();
    setIsLoading(false);

    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, channelId, initializeSocket]);

  // Gulir ke pesan terbaru
  useEffect(() => {
    if (messagesEndRef.current && page === 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, page]);

  // Infinite scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !isLoading) {
        setIsLoading(true);
        setPage((prev) => prev + 1);
        socketRef.current?.emit("getMessages", { channelId, limit: 20, skip: (page + 1) * 20 });
        setIsLoading(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, page, channelId]);

  // Kirim pesan
  const sendMessage = useCallback(() => {
    if (!socketRef.current || (!newMsg.trim() && !selectedImage) || isUploading) return;

    setIsUploading(true);
    const messageData = {
      text: newMsg.trim(),
      image: null,
      channelId,
    };

    console.log("🔍 Mengirim pesan:", messageData);

    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        messageData.image = e.target.result;
        socketRef.current.emit("sendMessage", messageData, (response) => {
          if (response?.error) {
            setError(response.error);
            toast.error(response.error);
          } else {
            setNewMsg("");
            setSelectedImage(null);
            setImagePreview(null);
            socketRef.current.emit("stopTyping", { channelId });
          }
          setIsUploading(false);
        });
      };
      reader.onerror = () => {
        setError("Gagal membaca file gambar.");
        toast.error("Gagal membaca file gambar.");
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedImage);
    } else {
      socketRef.current.emit("sendMessage", messageData, (response) => {
        if (response?.error) {
          setError(response.error);
          toast.error(response.error);
        } else {
          setNewMsg("");
          socketRef.current.emit("stopTyping", { channelId });
        }
        setIsUploading(false);
      });
    }
  }, [newMsg, selectedImage, isUploading, channelId]);

  // Penanganan mengetik
  const handleTyping = useCallback(
    (e) => {
      const value = e.target.value;
      setNewMsg(value);
      if (!socketRef.current) return;

      if (value) {
        socketRef.current.emit("typing", { channelId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit("stopTyping", { channelId });
        }, 3000);
      } else {
        socketRef.current.emit("stopTyping", { channelId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [channelId]
  );

  // Pilih gambar
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Hanya file gambar yang diizinkan.");
      toast.error("Hanya file gambar yang diizinkan.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar terlalu besar (maks 5MB).");
      toast.error("Ukuran gambar terlalu besar (maks 5MB).");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Edit pesan
  const handleEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  const saveEdit = useCallback(() => {
    if (!socketRef.current || !editText.trim()) return;
    socketRef.current.emit("editMessage", { id: editingId, text: editText, channelId }, (response) => {
      if (response?.error) {
        setError(response.error);
        toast.error(response.error);
      }
    });
  }, [editingId, editText, channelId]);

  // Hapus pesan
  const handleDelete = useCallback(
    (id) => {
      if (!socketRef.current) return;
      socketRef.current.emit("deleteMessage", id, (response) => {
        if (response?.error) {
          setError(response.error);
          toast.error(response.error);
        }
      });
    },
    []
  );

  // Render
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="hidden md:inline">Hai, {user?.displayName || user?.username}</span>
          <span className="text-sm opacity-75">({connectionStatus})</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white text-gray-900 rounded-md shadow-lg">
              <button
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {showOnlineUsers ? "Sembunyikan Pengguna Online" : "Tampilkan Pengguna Online"}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("chat-app-token");
                  localStorage.removeItem("chat-app-user");
                  router.push("/login");
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </header>

      {showOnlineUsers && (
        <div className="bg-gray-200 p-4">
          <h3 className="font-bold">Pengguna Online ({onlineUsers.length})</h3>
          <ul className="mt-2 space-y-1">
            {onlineUsers.map((u) => (
              <li key={u.userId} className="text-sm">
                {u.displayName || u.username}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-2 text-center">{error}</div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z"
              ></path>
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p>Belum ada pesan di channel ini. Mulai percakapan!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = user?.id && msg.senderId && msg.senderId.toString() === user.id.toString();
            return (
              <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-lg p-3 rounded-2xl shadow-sm ${
                    isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-900 border"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold opacity-80">{msg.senderName}</span>
                    <span className="text-xs opacity-70">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("id-ID") : ""}
                      {msg.updatedAt && " (diedit)"}
                    </span>
                  </div>
                  {msg.image && (
                    <div className="my-2">
                      <img
                        src={msg.image}
                        alt="Gambar pesan"
                        className="max-w-full rounded-lg max-h-64 object-cover"
                      />
                    </div>
                  )}
                  {msg.text && <span className="block text-base">{msg.text}</span>}
                  {editingId === msg._id ? (
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
                        className="flex-1 p-2 rounded border text-black"
                        autoFocus
                      />
                      <div className="flex space-x-2 self-end">
                        <button
                          onClick={saveEdit}
                          className="bg-green-500 px-3 py-1 rounded text-white text-sm"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                          className="bg-gray-400 px-3 py-1 rounded text-white text-sm"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    isOwn && (
                      <div className="flex space-x-2 mt-1 justify-end">
                        <button
                          onClick={() => handleEdit(msg)}
                          className="text-xs text-blue-100 hover:text-blue-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="text-xs text-red-300 hover:text-red-500 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {imagePreview && (
        <div className="p-4 bg-gray-200">
          <img src={imagePreview} alt="Pratinjau" className="max-h-32 rounded-lg" />
          <button
            onClick={() => {
              setSelectedImage(null);
              setImagePreview(null);
              fileInputRef.current.value = null;
            }}
            className="mt-2 text-sm text-red-600"
          >
            Hapus Gambar
          </button>
        </div>
      )}

      <div className="p-4 bg-gray-200">
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            {typingUsers.map((u) => u.displayName || u.username).join(", ")} sedang mengetik...
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="p-2 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
            disabled={isUploading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            type="text"
            value={newMsg}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-2 rounded border text-black"
            placeholder="Ketik pesan..."
            disabled={isUploading}
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            disabled={isUploading || (!newMsg.trim() && !selectedImage)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
