import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// Gunakan URL backend yang benar - pastikan endpoint Socket.IO tersedia
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-backend-new-328274fe4961.herokuapp.com";

export default function useSocket(user) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      // Jika user null, pastikan socket terputus
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnectionStatus("disconnected");
      }
      return;
    }

    // Jika socket sudah aktif, jangan buat ulang
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    console.log("Connecting to socket server:", SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: {
        token: sessionStorage.getItem("chat-app-token") || "",
        userId: user?.id || "",
        username: user?.displayName || user?.username || "Anonim"
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    setConnectionStatus("connecting");

    // Event koneksi
    newSocket.on("connect", () => {
      console.log("✅ Socket terhubung:", newSocket.id);
      setConnectionStatus("connected");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Koneksi error:", error);
      setConnectionStatus("error");
      setIsSending(false);
    });

    // Load semua pesan lama
    newSocket.on("allMessages", (msgs) => {
      console.log("Received messages:", msgs);
      setMessages(Array.isArray(msgs) ? msgs : []);
    });

    // Pesan baru diterima
    newSocket.on("newMessage", (msg) => {
      console.log("New message received:", msg);
      setMessages((prev) => [...prev, msg]);
      setIsSending(false);
    });

    // Daftar pengguna online
    newSocket.on("onlineUsers", (users) => {
      console.log("Online users:", users);
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    // Jika koneksi putus
    newSocket.on("disconnect", (reason) => {
      console.warn("❌ Socket terputus:", reason);
      setConnectionStatus("disconnected");
    });

    // Event reconnect
    newSocket.on("reconnecting", (attempt) => {
      console.log(`🔄 Mencoba reconnect (attempt ${attempt})`);
      setConnectionStatus("reconnecting");
    });

    // Bersihkan saat unmount
    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection");
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnectionStatus("disconnected");
      }
    };
  }, [user]);

  // Fungsi kirim pesan dengan useCallback untuk optimisasi
  const sendMessage = useCallback((text) => {
    if (!socket || !text.trim() || isSending) return;
    
    setIsSending(true);
    socket.emit("sendMessage", {
      text: text.trim(),
      senderName: user?.displayName || user?.username || "Anonim",
      userId: user?.id || "",
      timestamp: new Date().toISOString()
    });
    
    // Timeout untuk mencegah isSending tetap true jika ada masalah
    setTimeout(() => {
      setIsSending(false);
    }, 5000);
  }, [socket, user, isSending]);

  return {
    socket,
    messages,
    onlineUsers,
    sendMessage,
    isSending,
    connectionStatus,
  };
}
