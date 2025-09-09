"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function useSocket(user) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const typingTimeoutRef = useRef(null);

  // Inisialisasi socket
  useEffect(() => {
    if (!user || !user.id) return;

    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // Tambahkan polling sebagai fallback
      autoConnect: true,
      auth: {
        token: user.token // Server mengharapkan token, bukan userId dan username
      }
    });

    setSocket(s);

    // Event connection status
    s.on("connect", () => {
      console.log("Connected to server");
      setConnectionStatus("connected");
    });
    
    s.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnectionStatus("disconnected");
    });
    
    s.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setConnectionStatus("error");
    });

    // Event untuk menerima semua pesan saat pertama connect
    s.on("allMessages", (messages) => {
      console.log("Received all messages:", messages);
      setMessages(messages);
    });

    // Event untuk menerima pesan baru - PERBAIKAN: Sesuai dengan event server
    s.on("newMessage", (msg) => {
      console.log("Received new message:", msg);
      setMessages(prev => [...prev, msg]);
    });

    // Event untuk menerima pesan yang di-edit - PERBAIKAN: Sesuai dengan event server
    s.on("editMessage", (updatedMsg) => {
      console.log("Message edited:", updatedMsg);
      setMessages(prev => prev.map(m => 
        (m._id === updatedMsg.id ? {...m, text: updatedMsg.text, updatedAt: updatedMsg.updatedAt} : m)
      ));
    });

    // Event untuk menerima pesan yang dihapus - PERBAIKAN: Sesuai dengan event server
    s.on("deleteMessage", (id) => {
      console.log("Message deleted:", id);
      setMessages(prev => prev.filter(m => m._id !== id));
    });

    // Event untuk menerima daftar user online
    s.on("onlineUsers", (users) => {
      console.log("Online users:", users);
      setOnlineUsers(users);
    });

    // Event untuk typing indicator - PERBAIKAN: Sesuai dengan event server
    s.on("userTyping", (userData) => {
      console.log("User typing:", userData);
      setTypingUsers(prev => {
        // Cek jika user sudah ada dalam daftar
        const userExists = prev.some(u => u.userId === userData.userId);
        return userExists ? prev : [...prev, userData];
      });
    });

    s.on("userStoppedTyping", (userData) => {
      console.log("User stopped typing:", userData);
      setTypingUsers(prev => prev.filter(u => u.userId !== userData.userId));
    });

    // Event untuk error
    s.on("error", (errorMsg) => {
      console.error("Socket error:", errorMsg);
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  // Fungsi kirim pesan - PERBAIKAN: Sesuai dengan struktur yang diharapkan server
  const sendMessage = useCallback(
    async (text, imageFile = null) => {
      if (!socket || (!text?.trim() && !imageFile)) return;

      setIsSending(true);

      try {
        // Jika ada gambar, convert ke base64
        let imageBase64 = null;
        if (imageFile) {
          imageBase64 = await fileToBase64(imageFile);
        }

        // PERBAIKAN: Sesuaikan dengan struktur data yang diharapkan server
        socket.emit("sendMessage", {
          text: text?.trim() || "",
          image: imageBase64
          // Server sudah tahu userId dari token auth
        });

      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [socket]
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

  // Typing indicator - PERBAIKAN: Sesuai dengan event server
  const startTyping = useCallback(() => {
    if (!socket) return;

    socket.emit("typing");
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout untuk stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket]);

  const stopTyping = useCallback(() => {
    if (!socket) return;
    
    socket.emit("stopTyping");
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket]);

  // Fungsi untuk edit pesan
  const editMessage = useCallback((messageId, newText) => {
    if (!socket || !newText?.trim()) return;
    
    socket.emit("editMessage", {
      id: messageId,
      text: newText.trim()
    });
  }, [socket]);

  // Fungsi untuk hapus pesan
  const deleteMessage = useCallback((messageId) => {
    if (!socket) return;
    
    socket.emit("deleteMessage", messageId);
  }, [socket]);

  // Fungsi untuk memuat pesan tambahan
  const loadMoreMessages = useCallback((limit = 50, skip = 0) => {
    if (!socket) return;
    
    socket.emit("getMessages", { limit, skip });
  }, [socket]);

  return {
    socket,
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    startTyping,
    stopTyping,
    isSending,
    connectionStatus
  };
}
