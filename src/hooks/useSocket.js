import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const socketRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("chat-app-token");
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    // Cegah koneksi ulang
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    // Buat koneksi baru dengan autentikasi token
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      secure: true,
      withCredentials: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Status koneksi
    newSocket.on("connect", () => setConnectionStatus("connected"));
    newSocket.on("disconnect", () => setConnectionStatus("disconnected"));
    newSocket.on("connect_error", () => setConnectionStatus("error"));
    newSocket.on("reconnect_attempt", () => setConnectionStatus("connecting"));
    newSocket.on("reconnect", () => setConnectionStatus("connected"));

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
