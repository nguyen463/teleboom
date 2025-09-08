import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);

  useEffect(() => {
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    // Ambil token dari sessionStorage
    const token = sessionStorage.getItem("chat-app-token");

    // Cegah koneksi ulang kalau sudah ada
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    // Buat koneksi baru dengan autentikasi
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
      auth: {
        token: token || "", // kirim token ke server
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 60000,
      secure: SOCKET_URL.startsWith("https"),
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Event koneksi
    newSocket.on("connect", () => {
      console.log("✅ Socket terhubung:", newSocket.id);
      setConnectionStatus("connected");
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket terputus:", reason);
      setConnectionStatus("disconnected");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Gagal konek socket:", error.message);
      if (error.message === "Autentikasi diperlukan") {
        // Token invalid → redirect ke login
        sessionStorage.removeItem("chat-app-token");
        sessionStorage.removeItem("chat-user");
        window.location.href = "/login";
      }
      setConnectionStatus("error");
    });

    newSocket.on("reconnect_attempt", (attempt) => {
      console.log("🔄 Mencoba reconnect:", attempt);
      setConnectionStatus("connecting");
    });

    newSocket.on("reconnect", () => {
      console.log("✅ Reconnect berhasil");
      setConnectionStatus("connected");
    });

    // Cleanup koneksi
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        newSocket.off();
        socketRef.current = null;
      }
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
