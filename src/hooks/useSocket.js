"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"; // ganti sesuai server

export default function useSocket(user) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const typingTimeoutRef = useRef(null);

  // Inisialisasi socket
  useEffect(() => {
    if (!user) return;

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { userId: user.id, username: user.username || user.displayName }
    });

    setSocket(s);

    s.on("connect", () => setConnectionStatus("connected"));
    s.on("disconnect", () => setConnectionStatus("disconnected"));
    s.on("connect_error", () => setConnectionStatus("error"));
    s.on("reconnect", () => setConnectionStatus("reconnecting"));

    // Pesan diterima
    s.on("receiveMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Pesan di-edit
    s.on("updateMessage", (updatedMsg) => {
      setMessages(prev => prev.map(m => (m._id === updatedMsg._id ? updatedMsg : m)));
    });

    // Pesan dihapus
    s.on("deleteMessage", (id) => {
      setMessages(prev => prev.filter(m => m._id !== id));
    });

    // Online users
    s.on("onlineUsers", (users) => setOnlineUsers(users));

    // Typing users
    s.on("typing", (username) => {
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
    });
    s.on("stopTyping", (username) => {
      setTypingUsers(prev => prev.filter(u => u !== username));
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  // Fungsi kirim pesan
  const sendMessage = useCallback(
    async (text, imageFile = null) => {
      if (!socket || (!text && !imageFile)) return;

      setIsSending(true);

      // Jika ada gambar, convert ke base64
      let imageBase64 = null;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      }

      socket.emit("sendMessage", {
        text,
        image: imageBase64,
        userId: user.id,
        username: user.username || user.displayName,
        timestamp: new Date().toISOString()
      });

      setIsSending(false);
    },
    [socket, user]
  );

  // Helper konversi file ke base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Typing indicator
  const typing = useCallback(() => {
    if (!socket) return;

    socket.emit("typing", user.username || user.displayName);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", user.username || user.displayName);
    }, 1000);
  }, [socket, user]);

  const [typingUsers, setTypingUsers] = useState([]);

  return {
    socket,
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    typing,
    isSending,
    connectionStatus
  };
}
