import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://teleboom-backend-new.herokuapp.com";

export default function useSocket(user) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Jika socket sudah aktif, jangan buat ulang
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
      auth: {
        token: sessionStorage.getItem("chat-app-token") || "",
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Event koneksi
    newSocket.on("connect", () => {
      console.log("✅ Socket terhubung:", newSocket.id);
    });

    // Load semua pesan lama
    newSocket.on("allMessages", (msgs) => setMessages(msgs));

    // Pesan baru diterima
    newSocket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setIsSending(false); // ✅ Reset tombol kirim
    });

    // Daftar pengguna online
    newSocket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // Jika koneksi putus
    newSocket.on("disconnect", () => {
      console.warn("❌ Socket terputus");
    });

    // Bersihkan saat unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Fungsi kirim pesan
  const sendMessage = (text) => {
    if (!socket || !text.trim()) return;
    setIsSending(true);
    socket.emit("sendMessage", {
      text,
      senderName: user?.displayName || user?.username || "Anonim",
    });
  };

  return {
    socket,
    messages,
    onlineUsers,
    sendMessage,
    isSending,
  };
}
