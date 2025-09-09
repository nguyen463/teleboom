"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

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

  // Normalisasi data pesan untuk memastikan senderId dan _id adalah string
  const normalizeMessage = useCallback((msg) => ({
    ...msg,
    _id: msg._id?.toString() || Math.random().toString(),
    senderId: msg.senderId?.toString() || "",
  }), []);

  // Inisialisasi socket dengan konfigurasi reconnection
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
      socket.emit("getMessages", { limit: 20, skip: 0 });
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");
      setError("Terputus dari server. Mencoba menyambungkan kembali...");
    });

    socket.on("reconnect", () => {
      setConnectionStatus("connected");
      setError(null);
      socket.emit("getMessages", { limit: 20, skip: 0 });
    });

    socket.on("connect_error", (err) => {
      setConnectionStatus("error");
      setError("Koneksi gagal: " + err.message);
      toast.error("Koneksi gagal: " + err.message);
    });

    socket.on("allMessages", (msgs) => {
      const normalized = msgs.map(normalizeMessage);
      setMessages((prev) => (page === 0 ? normalized.reverse() : [...normalized.reverse(), ...prev]));
      setHasMore(msgs.length === 20);
    });

    socket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, normalizeMessage(msg)]);
    });

    socket.on("editMessage", ({ id, text, updatedAt }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, text, updatedAt } : m))
      );
      setEditingId(null);
      setEditText("");
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("userTyping", (userData) => {
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userData.userId)
          ? prev
          : [...prev, userData]
      );
    });

    socket.on("userStoppedTyping", (userData) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userData.userId));
    });

    socket.on("error", (errorMsg) => {
      setError(errorMsg);
      toast.error(`Error: ${errorMsg}`);
      if (errorMsg.includes("autentikasi") || errorMsg.includes("token")) {
        setTimeout(() => router.push("/login"), 2000);
      }
    });

    return socket;
  }, [user, router, normalizeMessage, page]);

  // Inisialisasi socket dan validasi pengguna
  useEffect(() => {
    console.log("🔍 Objek pengguna:", user);
    if (!user || !user.id || !user.token) {
      setError("Pengguna tidak terautentikasi. Mengalihkan ke login...");
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
  }, [user, initializeSocket]);

  // Gulir ke pesan terbaru
  useEffect(() => {
    if (messagesEndRef.current && page === 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, page]);

  // Infinite scroll untuk memuat pesan lama
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !isLoading) {
        setPage((prev) => prev + 1);
        socketRef.current?.emit("getMessages", { limit: 20, skip: (page + 1) * 20 });
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, page]);

  // Kirim pesan (teks atau gambar)
  const sendMessage = useCallback(() => {
    if ((!newMsg.trim() && !selectedImage) || !socketRef.current || isUploading) return;

    setIsUploading(true);
    const messageData = {
      text: newMsg.trim(),
      image: null,
    };

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
            socketRef.current.emit("stopTyping");
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
          socketRef.current.emit("stopTyping");
        }
        setIsUploading(false);
      });
    }
  }, [newMsg, selectedImage, isUploading]);

  // Penanganan mengetik
  const handleTyping = useCallback((e) => {
    const value = e.target.value;
    setNewMsg(value);
    if (!socketRef.current) return;

    if (value) {
      socketRef.current.emit("typing");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("stopTyping");
      }, 3000);
    } else {
      socketRef.current.emit("stopTyping");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  // Unggah gambar
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.match("image.*")) {
      setError("Hanya file gambar yang diizinkan.");
      toast.error("Hanya file gambar yang diizinkan.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB.");
      toast.error("Ukuran file maksimal 5MB.");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.onerror = () => {
      setError("Gagal memuat pratinjau gambar.");
      toast.error("Gagal memuat pratinjau gambar.");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Edit pesan
  const handleEdit = useCallback((msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editText.trim() || !socketRef.current || !editingId) return;

    socketRef.current.emit("editMessage", { id: editingId, text: editText.trim() }, (response) => {
      if (response?.error) {
        setError(response.error);
        toast.error(response.error);
      }
    });
    setEditingId(null);
    setEditText("");
  }, [editText, editingId]);

  const handleDelete = useCallback((id) => {
    if (!socketRef.current || !window.confirm("Hapus pesan ini?")) return;

    socketRef.current.emit("deleteMessage", id, (response) => {
      if (response?.error) {
        setError(response.error);
        toast.error(response.error);
      }
    });
  }, []);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

  // Status loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 justify-center items-center">
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-2 text-gray-600">Memuat obrolan...</p>
      </div>
    );
  }

  // Status error
  if (error && error.includes("Mengalihkan ke login")) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 justify-center items-center">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center">
          {error}
          <button
            onClick={() => router.push("/login")}
            className="ml-2 text-red-600 underline"
          >
            Ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header dengan Menu */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Ruang Obrolan</h1>
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline">Hai, {user?.displayName || user?.username}</span>
          <div className="flex items-center space-x-2">
            <span
              className={`h-3 w-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            ></span>
            <span className="text-sm">
              {connectionStatus === "connected"
                ? "Terhubung"
                : connectionStatus === "connecting"
                ? "Menghubungkan..."
                : "Terputus"}
            </span>
          </div>
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
        </div>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="bg-white shadow-md p-4 absolute top-16 right-4 z-10 rounded-lg">
          <div className="flex flex-col space-y-2">
            <span className="text-gray-700 font-bold">
              Hai, {user?.displayName || user?.username}
            </span>
            <button
              onClick={() => router.push("/profile")}
              className="text-left text-blue-600 hover:text-blue-800"
            >
              Profil
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="text-left text-blue-600 hover:text-blue-800"
            >
              Pengaturan
            </button>
            <button
              onClick={handleLogout}
              className="text-left text-red-600 hover:text-red-800"
            >
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* Panel Pengguna Online */}
      {showOnlineUsers && (
        <div className="bg-white border-b shadow-sm p-4">
          <h3 className="font-bold text-gray-700 mb-2">
            Pengguna Online ({onlineUsers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((userData) => (
              <div
                key={userData.userId}
                className="flex items-center bg-blue-100 px-3 py-1 rounded-full"
              >
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                <span className="text-sm text-gray-700">
                  {userData.displayName || userData.username}
                  {typingUsers.some((u) => u.userId === userData.userId) && (
                    <span className="text-xs text-green-500 animate-pulse"> (mengetik...)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Koneksi */}
      <div
        className={`p-2 text-center text-sm flex items-center justify-center space-x-2 ${
          connectionStatus === "connected"
            ? "bg-green-100 text-green-800"
            : connectionStatus === "connecting"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            connectionStatus === "connected"
              ? "bg-green-500"
              : connectionStatus === "connecting"
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
        ></span>
        <span>
          {connectionStatus === "connected"
            ? "Terhubung"
            : connectionStatus === "connecting"
            ? "Menghubungkan..."
            : "Terputus"}
        </span>
      </div>

      {/* Pesan */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.length === 0 ? (
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
              <p>Belum ada pesan. Mulai percakapan!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = user?.id && msg.senderId && msg.senderId.toString() === user.id.toString();

            console.log("🔍 DEBUG PESAN:", {
              messageId: msg._id,
              msgSenderId: msg.senderId,
              userId: user?.id,
              isOwn,
              types: {
                msgSenderIdType: typeof msg.senderId,
                userIdType: typeof user?.id,
              },
            });

            return (
              <div
                key={msg._id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
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

      {/* Pratinjau Gambar */}
      {imagePreview && (
        <div className="bg-gray-100 border-t p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={imagePreview} alt="Pratinjau" className="h-12 w-12 object-cover rounded" />
            <span className="text-sm text-gray-600">Gambar terpilih</span>
          </div>
          <button onClick={removeImage} className="text-red-500 hover:text-red-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Area Input */}
      <div className="flex flex-col p-4 space-y-2 border-t border-gray-300 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Tulis pesan..."
            value={newMsg}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={(!newMsg.trim() && !selectedImage) || isUploading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Kirim"
            )}
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <label
            htmlFor="image-upload"
            className="cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
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
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              ref={fileInputRef}
            />
          </label>
          <button
            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            className="text-gray-600 hover:text-blue-600 transition-colors"
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          <span className="text-sm text-gray-500">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </span>
        </div>
      </div>

      {/* Indikator Mengetik */}
      {typingUsers.length > 0 && (
        <div className="bg-white border-t px-4 py-2 text-sm text-gray-500 animate-pulse">
          {typingUsers.map((u) => u.displayName || u.username).join(", ")} sedang mengetik...
        </div>
      )}
    </div>
  );
}
