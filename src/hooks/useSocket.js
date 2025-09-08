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

    // Cegah koneksi ulang jika socket sudah aktif
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    // Buat koneksi baru
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"], // prioritaskan websocket
      path: "/socket.io",        // untuk heroku
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      secure: true,             // paksa https untuk heroku
      withCredentials: true,
      pingInterval: 25000,      // ping tiap 25 detik
      pingTimeout: 60000,       // timeout 60 detik
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Event socket
    newSocket.on("connect", () => setConnectionStatus("connected"));
    newSocket.on("disconnect", () => setConnectionStatus("disconnected"));
    newSocket.on("connect_error", () => setConnectionStatus("error"));
    newSocket.on("reconnect_attempt", () => setConnectionStatus("connecting"));
    newSocket.on("reconnect", () => setConnectionStatus("connected"));

    // Cleanup saat unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        newSocket.off();
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
