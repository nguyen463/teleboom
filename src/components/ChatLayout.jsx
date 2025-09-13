"use client";

import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ThemeContext } from "../components/ThemeContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId, logout }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

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
  const [activeMessageId, setActiveMessageId] = useState(null); // untuk mobile tap

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const router = useRouter();

  const normalizeMessage = useCallback(
    (msg) => {
      if (!msg) return null;
      try {
        let senderIdStr = '';
        if (msg.senderId) {
          if (typeof msg.senderId === 'object' && msg.senderId._id) {
            senderIdStr = msg.senderId._id.toString();
          } else if (typeof msg.senderId === 'string') {
            senderIdStr = msg.senderId;
          } else if (typeof msg.senderId === 'number') {
            senderIdStr = msg.senderId.toString();
          }
        }
        let channelIdStr = '';
        if (msg.channelId) {
          if (typeof msg.channelId === 'object' && msg.channelId.toString) {
            channelIdStr = msg.channelId.toString();
          } else if (typeof msg.channelId === 'string') {
            channelIdStr = msg.channelId;
          } else if (typeof msg.channelId === 'number') {
            channelIdStr = msg.channelId.toString();
          }
        }
        let senderName = "Unknown";
        if (msg.senderId) {
          if (typeof msg.senderId === 'object') {
            senderName = msg.senderId.displayName || msg.senderId.username || "Unknown";
          } else if (msg.senderName) {
            senderName = msg.senderName;
          }
        }
        return {
          ...msg,
          _id: msg._id ? msg._id.toString() : Math.random().toString(),
          senderId: senderIdStr,
          channelId: channelIdStr,
          senderName: senderName
        };
      } catch (error) {
        console.error("Error normalizing message:", error, msg);
        return null;
      }
    },
    []
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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

  // Socket connection & listeners
  useEffect(() => {
    if (!user?.token || !channelId) {
      setError("Token or channelId not found. Redirecting...");
      setIsLoading(false);
      setTimeout(() => router.push("/channels"), 2000);
      return;
    }

    if (socketRef.current) socketRef.current.disconnect();

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
      setMessages((prev) =>
        prev.map((m) => (m._id === normalized._id ? normalized : m))
      );
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

  // Infinite scroll
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
          } else {
            setIsLoading(false);
          }
        });
      }
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [hasMore, isLoading, page, channelId, normalizeMessage]);

  // Handle typing
  const handleTyping = useCallback((e) => {
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
  }, [channelId]);

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
    } else {
      socketRef.current.emit("sendMessage", messageData, onSent);
    }
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

  const handleDelete = useCallback((id) => {
    if (!socketRef.current) return;
    if (!confirm("Are you sure?")) return;
    socketRef.current.emit("deleteMessage", { id, channelId });
  }, [channelId]);

  const userDisplayName = user?.displayName || user?.username;

  // Klik di luar untuk tutup tombol mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".message-item")) setActiveMessageId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <ToastContainer position="top-right" autoClose={3000} theme={theme} />

      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <div>
          <span>Hi, {userDisplayName} ({connectionStatus})</span>
          <span className="ml-2 text-sm opacity-75">Channel: {channelId}</span>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-primary/90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-background border border-border text-foreground rounded-md shadow-lg z-10">
              <button onClick={() => setShowOnlineUsers(!showOnlineUsers)} className="block w-full px-4 py-2 hover:bg-muted">
                {showOnlineUsers ? "Hide Online Users" : "Show Online Users"}
              </button>
              <button onClick={toggleTheme} className="block w-full px-4 py-2 hover:bg-muted">
                Switch to {theme === "light" ? "Dark" : "Light"} Mode
              </button>
              <button onClick={logout} className="block w-full px-4 py-2 text-destructive hover:bg-destructive/90">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {showOnlineUsers && (
        <div className="bg-muted p-4">
          <h3 className="font-bold">Online Users ({onlineUsers.length})</h3>
          <ul className="mt-2 space-y-1">
            {onlineUsers.map(u => <li key={u.userId} className="text-sm">{u.displayName || u.username}</li>)}
          </ul>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground">No messages yet.</div>
        )}

        {messages.map(msg => {
          const isOwn = msg.senderId === user.id.toString();
          const showControls = isOwn && (activeMessageId === msg._id);
          return (
            <div key={msg._id} className={`message-item flex ${isOwn ? "justify-end" : "justify-start"}`} onClick={() => setActiveMessageId(msg._id)}>
              <div className={`max-w-lg p-3 rounded-2xl border ${isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground border-border"} relative`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold opacity-80">{msg.senderName}</span>
                  <span className="text-xs opacity-70">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}{msg.isEdited && " (edited)"}</span>
                </div>
                {msg.image && <img src={msg.image} alt="img" className="my-2 max-h-64 rounded-lg object-cover" />}
                <span className="block text-base">{msg.text}</span>

                {editingId === msg._id ? (
                  <div className="flex flex-col space-y-2 mt-2">
                    <input value={editText} onChange={(e) => setEditText(e.target.value)} className="p-2 rounded border-border bg-background text-foreground" />
                    <div className="flex space-x-2 justify-end">
                      <button onClick={saveEdit} className="bg-primary px-3 py-1 rounded text-primary-foreground text-sm">Save</button>
                      <button onClick={() => { setEditingId(null); setEditText(""); }} className="bg-muted px-3 py-1 rounded text-foreground text-sm">Cancel</button>
                    </div>
                  </div>
                ) : showControls && (
                  <div className="absolute top-1 right-1 flex space-x-1">
                    <button onClick={() => handleEdit(msg)} className="text-xs bg-background text-foreground px-2 py-1 rounded hover:bg-accent">Edit</button>
                    <button onClick={() => handleDelete(msg._id)} className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded hover:bg-destructive/90">Delete</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}></div>
      </div>

      {imagePreview && (
        <div className="p-4 bg-muted">
          <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
          <button onClick={() => { setSelectedImage(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="mt-2 text-sm text-destructive">Remove Image</button>
        </div>
      )}

      <div className="p-4 bg-secondary">
        {typingUsers.length > 0 && <div className="text-sm text-muted-foreground mb-2">{typingUsers.map(u => u.displayName || u.username).join(", ")} is typing...</div>}
        <div className="flex space-x-2">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if (!f) return; setSelectedImage(f); const reader = new FileReader(); reader.onload = e => setImagePreview(e.target.result); reader.readAsDataURL(f); }} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-muted rounded-full hover:bg-border" disabled={isUploading}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <input type="text" value={newMsg} onChange={handleTyping} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }} className="flex-1 p-2 rounded border-border bg-background" placeholder="Type a message..." disabled={isUploading} />
          <button onClick={sendMessage} className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90" disabled={isUploading || (!newMsg.trim() && !selectedImage)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
