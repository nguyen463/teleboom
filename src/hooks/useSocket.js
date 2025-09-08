import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function useSocket(user) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: {
        token: sessionStorage.getItem("chat-app-token") || "",
      },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("allMessages", (msgs) => setMessages(msgs));
    newSocket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setIsSending(false); // ✅ tombol send berhenti loading
    });

    newSocket.on("onlineUsers", (users) => setOnlineUsers(users));

    newSocket.on("messageDeleted", (id) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });

    newSocket.on("messageUpdated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    });

    newSocket.on("disconnect", () => {
      console.warn("❌ Socket disconnected");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const sendMessage = (text) => {
    if (!socket || !text.trim()) return;
    setIsSending(true);
    socket.emit("sendMessage", {
      text,
      senderName: user?.displayName || user?.username || "Anonim",
    });
  };

  return { socket, messages, onlineUsers, sendMessage, isSending };
}
