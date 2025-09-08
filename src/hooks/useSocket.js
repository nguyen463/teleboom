import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-backend-new.herokuapp.com";

export default function useSocket(user) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: {
        token: sessionStorage.getItem("chat-app-token"),
      },
    });

    setSocket(newSocket);

    // Saat koneksi berhasil
    newSocket.on("connect", () => {
      console.log("✅ Socket terhubung:", newSocket.id);
    });

    // Ambil semua pesan lama
    newSocket.on("allMessages", (data) => {
      setMessages(data);
    });

    // Pesan baru dari user lain
    newSocket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Konfirmasi pesan terkirim → matikan loading tombol
    newSocket.on("messageSent", (confirmedMsg) => {
      setIsSending(false);
      setMessages((prev) => [...prev, confirmedMsg]);
    });

    // Saat pesan dihapus
    newSocket.on("messageDeleted", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    // Saat pesan diupdate
    newSocket.on("messageUpdated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    });

    // Daftar online user diperbarui
    newSocket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // Cleanup saat komponen unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Fungsi kirim pesan
  const sendMessage = (text) => {
    if (!socket || !text.trim()) return;
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;

    socket.emit("sendMessage", {
      text,
      senderName: user?.displayName || user?.username || "Anonim",
      tempId,
    });
  };

  return {
    socket,
    messages,
    onlineUsers,
    isSending,
    sendMessage,
  };
}
