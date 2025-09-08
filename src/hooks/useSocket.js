// src/hooks/useSocket.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);

  useEffect(() => {
    // Ambil URL socket dari .env atau fallback
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    console.log("🔌 Connecting to:", SOCKET_URL);

    // Jika sudah terhubung, tidak perlu membuat koneksi baru
    if (socketRef.current && socketRef.current.connected) {
      console.log("✅ Socket already connected");
      setConnectionStatus("connected");
      setSocket(socketRef.current);
      return;
    }

    // Konfigurasi socket.io untuk Heroku agar koneksi stabil
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // paksa WebSocket dulu, polling fallback
      timeout: 15000,
      reconnectionAttempts: Infinity, // reconnect tanpa batas
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
      forceNew: false,
      pingTimeout: 60000, // default 60 detik
      pingInterval: 25000, // ping tiap 25 detik
    });

    socketRef.current = newSocket;

    // ====== EVENT HANDLERS ======
    const handleConnect = () => {
      console.log("✅ Socket connected successfully");
      setConnectionStatus("connected");
      // Hapus timeout reconnect yang tertunda
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleConnecting = () => {
      console.log("🔄 Connecting...");
      setConnectionStatus("connecting");
    };

    const handleDisconnect = (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setConnectionStatus("disconnected");

      // Jika putus bukan karena manual, coba reconnect
      if (
        reason === "transport close" ||
        reason === "ping timeout" ||
        reason === "transport error"
      ) {
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Manual reconnect after disconnect...");
            if (newSocket && !newSocket.connected) {
              newSocket.connect();
            }
            reconnectTimeoutRef.current = null;
          }, 3000);
        }
      }
    };

    const handleConnectError = (error) => {
      console.error("❌ Socket connection error:", error.message);
      setConnectionStatus("error");

      // Coba reconnect otomatis setelah 5 detik
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Reconnecting after error...");
          if (newSocket && !newSocket.connected) {
            newSocket.connect();
          }
          reconnectTimeoutRef.current = null;
        }, 5000);
      }
    };

    const handleReconnectAttempt = (attempt) => {
      console.log(`🔄 Reconnect attempt ${attempt}`);
      setConnectionStatus("connecting");
    };

    const handleReconnect = (attempt) => {
      console.log(`✅ Socket reconnected after ${attempt} attempts`);
      setConnectionStatus("connected");
    };

    const handleReconnectError = (error) => {
      console.error("❌ Reconnect error:", error.message);
      setConnectionStatus("error");
    };

    const handleReconnectFailed = () => {
      console.error("❌ Reconnect failed");
      setConnectionStatus("error");

      // Retry manual setelah 5 detik
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Manual reconnect after failure...");
          if (newSocket && !newSocket.connected) {
            newSocket.connect();
          }
          reconnectTimeoutRef.current = null;
        }, 5000);
      }
    };

    const handleError = (error) => {
      console.error("❌ Socket error:", error);
      setConnectionStatus("error");
    };

    // ====== PING-PONG UNTUK HEROKU ======
    keepAliveIntervalRef.current = setInterval(() => {
      if (newSocket && newSocket.connected) {
        newSocket.emit("ping", { timestamp: Date.now() });
      }
    }, 20000); // ping tiap 20 detik untuk jaga koneksi

    // Pasang listener
    newSocket.on("connect", handleConnect);
    newSocket.on("connecting", handleConnecting);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("connect_error", handleConnectError);
    newSocket.on("reconnect_attempt", handleReconnectAttempt);
    newSocket.on("reconnect", handleReconnect);
    newSocket.on("reconnect_error", handleReconnectError);
    newSocket.on("reconnect_failed", handleReconnectFailed);
    newSocket.on("error", handleError);

    setSocket(newSocket);

    // ====== CLEANUP ======
    return () => {
      console.log("🧹 Cleaning up socket...");
      clearInterval(keepAliveIntervalRef.current);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (newSocket) {
        newSocket.off("connect", handleConnect);
        newSocket.off("connecting", handleConnecting);
        newSocket.off("disconnect", handleDisconnect);
        newSocket.off("connect_error", handleConnectError);
        newSocket.off("reconnect_attempt", handleReconnectAttempt);
        newSocket.off("reconnect", handleReconnect);
        newSocket.off("reconnect_error", handleReconnectError);
        newSocket.off("reconnect_failed", handleReconnectFailed);
        newSocket.off("error", handleError);
        if (newSocket.connected) {
          newSocket.disconnect();
        }
      }
      setConnectionStatus("disconnected");
    };
  }, []);

  return {
    socket,
    connectionStatus,
    isConnected: connectionStatus === "connected",
    isConnecting: connectionStatus === "connecting",
    hasError: connectionStatus === "error",
  };
}
