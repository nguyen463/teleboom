"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
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

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      setError("No token found. Please log in again.");
      logout();
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
    });

    return socket;
  }, []);

  useEffect(() => {
    if (!user || !user.id) {
      setError("User not loaded. Please log in.");
      return;
    }

    socketRef.current = initializeSocket();

    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, initializeSocket]);

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

  // ... (JSX remains mostly unchanged, with minor additions for error display)

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 text-red-800 p-2 text-center text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-600 underline">Dismiss</button>
        </div>
      )}
      {/* ... rest of the JSX ... */}
    </div>
  );
}
