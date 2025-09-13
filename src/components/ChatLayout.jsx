"use client";

import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ThemeContext } from "../components/ThemeContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ initialUser, channelId, logout }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const router = useRouter();

  // --- User state dengan persistence ---
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    // Ambil user dari props atau localStorage
    if (initialUser?.token) {
      setUser(initialUser);
    } else {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      if (storedUser && storedToken) {
        setUser({ ...JSON.parse(storedUser), token: storedToken });
      }
    }
    setLoadingUser(false);
  }, [initialUser]);

  // --- Jika user tidak ada, redirect ke login ---
  useEffect(() => {
    if (!loadingUser && !user?.token) {
      router.push("/login");
    } else if (user?.token) {
      // Simpan user di localStorage agar persistent
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", user.token);
    }
  }, [user, loadingUser, router]);

  // --- States Chat ---
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const longPressTimeoutRef = useRef(null);

  // --- Normalisasi pesan ---
  const normalizeMessage = useCallback((msg) => {
    if (!msg) return null;
    try {
      let senderIdStr = "";
      if (msg.senderId) {
        if (typeof msg.senderId === "object" && msg.senderId._id)
          senderIdStr = msg.senderId._id.toString();
        else senderIdStr = msg.senderId.toString();
      }
      let channelIdStr = "";
      if (msg.channelId) {
        if (typeof msg.channelId === "object" && msg.channelId.toString)
          channelIdStr = msg.channelId.toString();
        else channelIdStr = msg.channelId.toString();
      }
      let senderName = "Unknown";
      if (msg.senderId) {
        if (typeof msg.senderId === "object")
          senderName = msg.senderId.displayName || msg.senderId.username || "Unknown";
        else if (msg.senderName) senderName = msg.senderName;
      }
      return {
        ...msg,
        _id: msg._id ? msg._id.toString() : Math.random().toString(),
        senderId: senderIdStr,
        channelId: channelIdStr,
        senderName,
      };
    } catch (error) {
      console.error("Error normalizing message:", error, msg);
      return null;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- Reset state saat channel berubah ---
  useEffect(() => {
    setMessages([]);
    setPage(0);
    setHasMore(true);
    setNewMsg("");
    setEditingId(null);
    setEditText("");
    setSelectedImage(null);
    setImagePreview(null);
    setTypingUsers([]);
    setError(null);
    setIsLoading(true);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [channelId]);

  // --- Socket connection ---
  useEffect(() => {
    if (!user?.token || !channelId) return;

    const socket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setError(null);
      socket.emit("joinChannel", channelId);
      socket.emit("getMessages", { channelId, limit: 20, skip: 0 }, (res) => {
        if (Array.isArray(res)) {
          const normalized = res.map(normalizeMessage).filter(Boolean);
          setMessages(normalized);
          setHasMore(res.length === 20);
          setPage(0);
          setIsLoading(false);
          setTimeout(scrollToBottom, 100);
        } else if (res?.error) {
          toast.error(res.error);
          setError(res.error);
          setIsLoading(false);
        }
      });
    });

    socket.on("newMessage", (msg) => {
      const normalized = normalizeMessage(msg);
      if (!normalized || normalized.channelId !== channelId) return;
      setMessages((prev) => [...prev, normalized]);
      setTimeout(scrollToBottom, 100);
    });

    socket.on("editMessage", (msg) => {
      const normalized = normalizeMessage(msg);
      if (!normalized || normalized.channelId !== channelId) return;
      setMessages((prev) => prev.map((m) => (m._id === normalized._id ? normalized : m)));
      if (editingId === normalized._id) {
        setEditingId(null);
        setEditText("");
      }
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id.toString()));
    });

    socket.on("online_users", setOnlineUsers);

    socket.on("userTyping", (data) => {
      if (data.userId !== user.id) {
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== data.userId);
          return data.isTyping ? [...filtered, data] : filtered;
        });
      }
    });

    socket.on("error", (err) => {
      toast.error(err.message || err);
      if ((err.message || "").includes("authentication")) logout();
      else if ((err.message || "").includes("channel")) router.push("/channels");
    });

    return () => {
      socket.emit("leaveChannel", channelId);
      socket.disconnect();
    };
  }, [user, channelId, router, normalizeMessage, logout, scrollToBottom, editingId]);

  // --- Infinite scroll ---
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (container.scrollTop === 0 && hasMore && !isLoading) {
        setIsLoading(true);
        const skip = (page + 1) * 20;
        const oldScrollHeight = container.scrollHeight;
        socketRef.current.emit("getMessages", { channelId, limit: 20, skip }, (res) => {
          if (Array.isArray(res)) {
            const newMsgs = res.map(normalizeMessage).filter(Boolean);
            setMessages((prev) => [...newMsgs, ...prev]);
            setHasMore(res.length === 20);
            setPage((prev) => prev + 1);
            setTimeout(() => {
              container.scrollTop = container.scrollHeight - oldScrollHeight;
              setIsLoading(false);
            }, 0);
          } else setIsLoading(false);
        });
      }
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [hasMore, isLoading, page, channelId, normalizeMessage]);

  // --- Handle typing ---
  const handleTyping = useCallback(
    (e) => {
      const value = e.target.value;
      setNewMsg(value);
      if (!socketRef.current) return;
      socketRef.current.emit("typing", { channelId, isTyping: value.length > 0 });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (value.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit("typing", { channelId, isTyping: false });
        }, 3000);
      }
    },
    [channelId]
  );

  const sendMessage = useCallback(() => {
    if (!socketRef.current || (!newMsg.trim() && !selectedImage)) return;
    setIsUploading(true);
    const messageData = { text: newMsg.trim(), channelId };
    const onSent = (res) => {
      if (res?.error) toast.error(res.error);
      setNewMsg("");
      setSelectedImage(null);
      setImagePreview(null);
      setIsUploading(false);
    };
    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        messageData.image = e.target.result;
        socketRef.current.emit("sendMessage", messageData, onSent);
      };
      reader.readAsDataURL(selectedImage);
    } else socketRef.current.emit("sendMessage", messageData, onSent);
  }, [newMsg, selectedImage, channelId]);

  const handleEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  const saveEdit = useCallback(() => {
    if (!socketRef.current || !editText.trim() || !editingId) return;
    socketRef.current.emit("editMessage", { id: editingId, text: editText, channelId });
    setEditingId(null);
    setEditText("");
  }, [editingId, editText, channelId]);

  const handleDelete = useCallback(
    (id) => {
      if (!socketRef.current) return;
      if (!confirm("Are you sure?")) return;
      socketRef.current.emit("deleteMessage", { id, channelId });
    },
    [channelId]
  );

  const userDisplayName = user?.displayName || user?.username;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".message-item")) setActiveMessageId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTouchStart = (id) => {
    longPressTimeoutRef.current = setTimeout(() => setActiveMessageId(id), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimeoutRef.current);

  // --- Jika user belum selesai load, tampilkan loading ---
  if (loadingUser || !user) return <div>Loading...</div>;

  // --- Render ChatLayout ---
  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* --- Toast & Header & Chat messages --- */}
      {/* ... semua JSX sama seperti kode yang bos kirim sebelumnya ... */}
    </div>
  );
}
