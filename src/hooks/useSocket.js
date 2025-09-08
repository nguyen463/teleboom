import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);

  useEffect(() => {
    // Pastikan URL backend sesuai
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    // Cegah koneksi ulang kalau socket sudah ada & aktif
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    // Inisialisasi koneksi Socket.IO
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // fallback polling kalau websocket gagal
      path: "/socket.io",                   // penting untuk Heroku
      reconnection: true,
      reconnectionAttempts: Infinity,       // coba terus reconnect
      reconnectionDelay: 2000,              // delay tiap 2 detik
      timeout: 60000,                       // timeout koneksi
      secure: SOCKET_URL.startsWith("https"), // aktifkan secure kalau URL pakai https
      withCredentials: false,               // jangan pakai cookies
    });

    // Simpan socket di ref agar tidak membuat ulang
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

    // Cleanup koneksi saat unmount
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
