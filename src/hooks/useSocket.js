import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://teleboom-backend-new.herokuapp.com";

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

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // Tambahkan fallback transport
      path: "/socket.io",
      auth: {
        token: sessionStorage.getItem("chat-app-token") || "",
        userId: user?.id || "",
        username: user?.displayName || user?.username || "Anonim"
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    setConnectionStatus("connecting");

    // Event koneksi
    newSocket.on("connect", () => {
      console.log("✅ Socket terhubung:", newSocket.id);
      setConnectionStatus("connected");
      
      // Request messages dan users setelah terkoneksi
      newSocket.emit("getAllMessages");
      newSocket.emit("getOnlineUsers");
    });

    // Load semua pesan lama
    newSocket.on("allMessages", (msgs) => {
      setMessages(Array.isArray(msgs) ? msgs : []);
    });

    // Pesan baru diterima
    newSocket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setIsSending(false);
    });

    // Daftar pengguna online
    newSocket.on("onlineUsers", (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    // Event error
    newSocket.on("connect_error", (error) => {
      console.error("❌ Koneksi error:", error);
      setConnectionStatus("error");
      setIsSending(false);
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

  // Fungsi untuk memutuskan koneksi manual
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnectionStatus("disconnected");
    }
  }, []);

  // Fungsi untuk menyambungkan kembali manual
  const reconnectSocket = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  return {
    socket,
    messages,
    onlineUsers,
    sendMessage,
    isSending,
    connectionStatus,
    disconnect: disconnectSocket,
    reconnect: reconnectSocket
  };
}
