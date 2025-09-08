import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);

  useEffect(() => {
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      "https://teleboom-backend-new.herokuapp.com";

    const token = sessionStorage.getItem("chat-app-token");

    // Cegah koneksi ulang jika sudah ada socket
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    // Inisialisasi koneksi socket dengan autentikasi
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      secure: true,
      withCredentials: true,
      auth: {
        token, // Kirim token ke server
      },
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Event socket
    newSocket.on("connect", () => setConnectionStatus("connected"));
    newSocket.on("disconnect", () => setConnectionStatus("disconnected"));
    newSocket.on("connect_error", (err) => {
      console.error("❌ Gagal konek socket:", err.message);
      setConnectionStatus("error");
    });
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
