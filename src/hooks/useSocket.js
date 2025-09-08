import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-backend-new-328274fe4961.herokuapp.com";

// Pastikan menggunakan export default
const useSocket = (user) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnectionStatus("disconnected");
      }
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      setConnectionStatus("connected");
      return;
    }

    console.log("Connecting to socket server:", SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: {
        token: sessionStorage.getItem("chat-app-token") || "",
        userId: user?.id || "",
        username: user?.displayName || user?.username || "Anonim"
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    setConnectionStatus("connecting");

    newSocket.on("connect", () => {
      console.log("✅ Socket terhubung:", newSocket.id);
      setConnectionStatus("connected");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Koneksi error:", error);
      setConnectionStatus("error");
      setIsSending(false);
    });

    newSocket.on("allMessages", (msgs) => {
      console.log("Received messages:", msgs);
      setMessages(Array.isArray(msgs) ? msgs : []);
    });

    newSocket.on("newMessage", (msg) => {
      console.log("New message received:", msg);
      setMessages((prev) => [...prev, msg]);
      setIsSending(false);
    });

    newSocket.on("onlineUsers", (users) => {
      console.log("Online users:", users);
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("❌ Socket terputus:", reason);
      setConnectionStatus("disconnected");
    });

    newSocket.on("reconnecting", (attempt) => {
      console.log(`🔄 Mencoba reconnect (attempt ${attempt})`);
      setConnectionStatus("reconnecting");
    });

    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection");
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnectionStatus("disconnected");
      }
    };
  }, [user]);

  const sendMessage = useCallback((text) => {
    if (!socket || !text.trim() || isSending) return;
    
    setIsSending(true);
    socket.emit("sendMessage", {
      text: text.trim(),
      senderName: user?.displayName || user?.username || "Anonim",
      userId: user?.id || "",
      timestamp: new Date().toISOString()
    });
    
    setTimeout(() => {
      setIsSending(false);
    }, 5000);
  }, [socket, user, isSending]);

  return {
    socket,
    messages,
    onlineUsers,
    sendMessage,
    isSending,
    connectionStatus,
  };
};

// Ekspor sebagai default
export default useSocket;
