"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation"; // For redirection
import { logout } from "@/app/utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

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
  const [isLoading, setIsLoading] = useState(true); // New loading state

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const router = useRouter(); // For redirecting to login

  // Normalize message data
  const normalizeMessage = (msg) => ({
    ...msg,
    _id: msg._id?.toString() || Math.random().toString(),
    senderId: msg.senderId?.toString() || "",
  });

  // Initialize socket with reconnection logic
  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem("chat-app-token");
    if (!token) {
      setError("No authentication token found. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000); // Redirect after showing error
      return null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to socket server");
      setConnectionStatus("connected");
      setError(null);
      socket.emit("getMessages");
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected. Reason:", reason);
      setConnectionStatus("disconnected");
      if (reason === "io server disconnect" || reason === "transport close") {
        setError("Disconnected from server. Attempting to reconnect...");
      }
    });

    socket.on("reconnect", (attempt) => {
      console.log("🔁 Reconnected. Attempt:", attempt);
      setConnectionStatus("connected");
      setError(null);
      socket.emit("getMessages");
    });

    socket.on("reconnect_error", (err) => {
      console.error("❌ Reconnection error:", err);
      setConnectionStatus("error");
      setError("Failed to reconnect to server.");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setConnectionStatus("error");
      setError("Connection failed. Please check your network.");
    });

    socket.on("allMessages", (messages) => {
      setMessages(messages.map(normalizeMessage));
    });

    socket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, normalizeMessage(msg)]);
    });

    socket.on("editMessage", (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.id.toString() ? { ...m, text: data.text, updatedAt: data.updatedAt } : m
        )
      );
      setEditingId(null);
      setEditText("");
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id.toString()));
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("userTyping", (userData) => {
      setTypingUsers((prev) => {
        if (!prev.some((u) => u.userId === userData.userId)) {
          return [...prev, userData];
        }
        return prev;
      });
    });

    socket.on("userStoppedTyping", (userData) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userData.userId));
    });

    socket.on("error", (errorMsg) => {
      setError(errorMsg);
      if (errorMsg.includes("authentication") || errorMsg.includes("token")) {
        setTimeout(() => router.push("/login"), 2000); // Redirect on auth errors
      }
    });

    return socket;
  }, [router]);

  useEffect(() => {
    // Check for valid user and token
    const token = localStorage.getItem("chat-app-token");
    if (!token) {
      setError("No authentication token found. Redirecting to login...");
      setIsLoading(false);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    if (!user || !user.id) {
      setError("User data not loaded. Redirecting to login...");
      setIsLoading(false);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    setIsLoading(false); // User is valid, proceed
    socketRef.current = initializeSocket();

    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, initializeSocket, router]);

  // Handle page visibility for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message with error handling
  const sendMessage = useCallback(() => {
    if ((!newMsg.trim() && !selectedImage) || !socketRef.current || isUploading) return;

    setIsUploading(true);

    const send = (imageData = null) => {
      const messageData = {
        text: newMsg.trim(),
        image: imageData,
      };

      if (socketRef.current.connected) {
        socketRef.current.emit("sendMessage", messageData, (response) => {
          if (response?.error) {
            setError("Failed to send message: " + response.error);
          } else {
            setNewMsg("");
            setSelectedImage(null);
            setImagePreview(null);
            socketRef.current.emit("stopTyping");
          }
        });
      } else {
        setError("Cannot send message: Not connected to server.");
      }
      setIsUploading(false);
    };

    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = (e) => send(e.target.result);
      reader.onerror = () => {
        setError("Failed to read image file.");
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedImage);
    } else {
      send();
    }
  }, [newMsg, selectedImage, isUploading]);

  // Handle typing with debounce
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

  // Handle image selection with validation
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.match("image.*")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.onerror = () => setError("Failed to preview image.");
    reader.readAsDataURL(file);
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 justify-center items-center">
        <svg
          className="animate-spin h-8 w-8 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-2 text-gray-600">Loading user data...</p>
      </div>
    );
  }

  // Render error and redirect
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 justify-center items-center">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center">
          {error}
          <button
            onClick={() => {
              setError(null);
              router.push("/login");
            }}
            className="ml-2 text-red-600 underline"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 text-red-800 p-2 text-center text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-600 underline">
            Dismiss
          </button>
        </div>
      )}
      {/* ... rest of the JSX from the original code ... */}
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            className="relative p-2 rounded-full hover:bg-blue-700 transition-colors"
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
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-green-600 rounded-full">
              {onlineUsers.length}
            </span>
          </button>
          <span className="hidden md:inline">Hai, {user?.name}</span>
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
            <span className="text-sm text-white">
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Online Users Panel */}
      {showOnlineUsers && (
        <div className="bg-white border-b shadow-sm p-4">
          <h3 className="font-bold text-gray-700 mb-2">
            Online Users ({onlineUsers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((userData) => (
              <div
                key={userData.userId}
                className="flex items-center bg-blue-100 px-3 py-1 rounded-full"
              >
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                <span
                  className={`text-sm ${
                    userData.userId === user?.id
                      ? "font-bold text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  {userData.displayName || userData.username}
                  {typingUsers.some((u) => u.userId === userData.userId) && (
                    <span className="text-xs text-green-500"> (mengetik...)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status */}
      {connectionStatus !== "connected" && (
        <div
          className={`p-2 text-center text-sm ${
            connectionStatus === "connecting"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {connectionStatus === "connecting" ? "Menghubungkan..." : "Terkoneksi"}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
            const isOwn =
              user?.id && msg.senderId && msg.senderId.toString() === user.id.toString();

            return (
              <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-lg p-3 rounded-2xl shadow-sm ${
                    isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-900 border"
                  }`}
                >
                  {editingId === msg._id ? (
                    <div className="flex flex-col space-y-2">
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
                          onClick={() => {
                            if (!socketRef.current || !editText.trim() || !editingId) return;
                            console.log("📝 EDITING MESSAGE:", editingId, "with text:", editText);
                            socketRef.current.emit("editMessage", {
                              id: editingId,
                              text: editText.trim(),
                            });
                            setEditingId(null);
                            setEditText("");
                          }}
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
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold opacity-80">{msg.senderName}</span>
                        <span className="text-xs opacity-70">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}
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

                      <div className={`flex space-x-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                        {isOwn && (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(msg._id);
                                setEditText(msg.text);
                              }}
                              className="text-xs text-blue-100 hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (!socketRef.current) return;
                                console.log("🗑️ DELETING MESSAGE:", msg._id);
                                if (!window.confirm("Apakah Anda yakin ingin menghapus pesan ini?"))
                                  return;
                                socketRef.current.emit("deleteMessage", msg._id);
                              }}
                              className="text-xs text-red-300 hover:text-red-500 transition-colors"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="bg-gray-100 border-t p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={imagePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
            <span className="text-sm text-gray-600">Gambar terpilih</span>
          </div>
          <button
            onClick={() => {
              setSelectedImage(null);
              setImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-red-500 hover:text-red-700"
          >
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

      {/* Input area */}
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
          <span className="text-sm text-gray-500">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </span>
        </div>
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="bg-white border-t px-4 py-2 text-sm text-gray-500">
          {typingUsers.map((u) => u.displayName || u.username).join(", ")}{" "}
          {typingUsers.length === 1 ? "sedang mengetik..." : "sedang mengetik..."}
        </div>
      )}
    </div>
  );
}
