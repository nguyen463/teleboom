// src/components/ChatLayout.jsx
"use client";

import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ThemeContext } from "@/components/ThemeContext";
import { useAuth } from "@/app/utils/auth"; // Pastikan useAuth sudah benar diimpor

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId, logout }) {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const { api } = useAuth(); // Asumsi useAuth mengelola koneksi socket

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

  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const socketRef = useRef(null); // Gunakan ref untuk socket
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFetchMessages = useCallback(async (skip = 0, append = false) => {
    if (!api?.socket || !channelId) return;
    setIsLoading(true);
    try {
      api.socket.emit("getMessages", { channelId, limit: 20, skip }, (response) => {
        if (response?.error) {
          toast.error(response.error);
          setError(response.error);
        } else if (Array.isArray(response)) {
          if (append) {
            setMessages((prev) => [...response, ...prev]);
          } else {
            setMessages(response);
          }
          setHasMore(response.length === 20);
          setPage(skip / 20);
          if (!append) {
            setTimeout(scrollToBottom, 100);
          }
        } else {
          toast.error("Invalid response format for messages.");
          setError("Invalid response format for messages.");
        }
        setIsLoading(false);
      });
    } catch (err) {
      toast.error("Failed to load messages via API.");
      setError("Failed to load messages.");
      setIsLoading(false);
    }
  }, [api, channelId, scrollToBottom]);

  // ✅ Mengkonsolidasikan semua logika Socket.IO dan data ke dalam satu useEffect
  useEffect(() => {
    // Reset state saat channelId berubah
    setMessages([]);
    setPage(0);
    setHasMore(true);
    setTypingUsers([]);
    setError(null);
    setIsLoading(true);
    setIsMember(false);
    setIsOwner(false);

    if (!user?.token || !channelId) {
      setError("Token or channelId not found. Redirecting...");
      setIsLoading(false);
      setTimeout(() => router.push("/channels"), 2000);
      return;
    }
    
    // Inisialisasi koneksi Socket.IO
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token: user.token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }

    const socket = socketRef.current;
    
    // Event listeners
    const handleConnect = () => {
      setConnectionStatus("connected");
      setError(null);
      console.log("🔗 Socket connected, ID:", socket.id);
      
      socket.emit("checkMembership", channelId, (response) => {
        if (response?.error) {
          setError(response.error);
          setIsLoading(false);
          toast.error(response.error);
          return;
        }
        setIsMember(response.isMember);
        setIsOwner(response.isOwner);

        if (response?.isMember) {
          socket.emit("joinChannel", channelId);
          handleFetchMessages(0, false);
        } else {
          setIsLoading(false);
          toast.info("You need to join this channel to see messages.");
        }
      });
    };

    const handleDisconnect = (reason) => {
      setConnectionStatus("disconnected");
      console.log("🔍 Socket disconnected:", reason);
    };

    const handleConnectError = (err) => {
      setConnectionStatus("error");
      setIsLoading(false);
      toast.error("Connection failed: " + err.message);
    };

    const handleMessagesCleared = () => {
      setMessages([]);
      setHasMore(false);
      setPage(0);
    };

    const handleNewMessage = (msg) => {
      if (msg.channelId === channelId) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      }
    };
    
    const handleEditedMessage = (updatedMsg) => {
      if (updatedMsg.channelId === channelId) {
        setMessages((prev) => prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)));
        setEditingId(null);
        setEditText("");
      }
    };
    
    const handleDeleteMessage = (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    };

    const handleOnlineUsers = (users) => setOnlineUsers(users);

    const handleUserTyping = (data) => {
      if (data.channelId === channelId && data.userId !== user.id) {
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== data.userId);
          return data.isTyping ? [...filtered, data] : filtered;
        });
      }
    };

    const handleError = (errorMsg) => {
      const message = errorMsg?.message || errorMsg || "Unknown error";
      toast.error(`Error: ${message}`);
      if (message.includes("authentication") || message.includes("token")) {
        logout();
      } else if (message.includes("channel")) {
        router.push("/channels");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("messagesCleared", handleMessagesCleared);
    socket.on("newMessage", handleNewMessage);
    socket.on("editMessage", handleEditedMessage);
    socket.on("deleteMessage", handleDeleteMessage);
    socket.on("online_users", handleOnlineUsers);
    socket.on("userTyping", handleUserTyping);
    socket.on("error", handleError);
    
    // Cleanup: Membersihkan event listeners saat komponen di-unmount
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("messagesCleared", handleMessagesCleared);
      socket.off("newMessage", handleNewMessage);
      socket.off("editMessage", handleEditedMessage);
      socket.off("deleteMessage", handleDeleteMessage);
      socket.off("online_users", handleOnlineUsers);
      socket.off("userTyping", handleUserTyping);
      socket.off("error", handleError);
      socket.emit("leaveChannel", channelId);
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, channelId, router, logout, api, scrollToBottom, handleFetchMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !isLoading && isMember) {
        handleFetchMessages((page + 1) * 20, true);
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, page, channelId, isMember, handleFetchMessages]);

  const sendMessage = useCallback(() => {
    if (!api?.socket || !isMember || (!newMsg.trim() && !selectedImage) || isUploading) return;
    setIsUploading(true);

    const messageData = { text: newMsg.trim(), channelId };

    const onMessageSent = (response) => {
      if (!response || response?.error) {
        setError(response?.error || "Failed to send message: Connection error.");
        toast.error(response?.error || "Gagal mengirim pesan: Masalah koneksi.");
      } else {
        setNewMsg("");
        setSelectedImage(null);
        setImagePreview(null);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          api.socket.emit("typing", { channelId, isTyping: false });
        }
      }
      setIsUploading(false);
    };

    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        messageData.image = e.target.result;
        api.socket.emit("sendMessage", messageData, onMessageSent);
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
        toast.error("Failed to read image file.");
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedImage);
    } else {
      api.socket.emit("sendMessage", messageData, onMessageSent);
    }
  }, [newMsg, selectedImage, isUploading, channelId, isMember, api]);

  const handleTyping = useCallback((e) => {
    const value = e.target.value;
    setNewMsg(value);
    if (!api?.socket || !isMember) return;
    api.socket.emit("typing", { channelId, isTyping: value.length > 0 });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        api.socket.emit("typing", { channelId, isTyping: false });
      }, 3000);
    }
  }, [api, channelId, isMember]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    const maxSizeInBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast.error("Image size too large (max 25MB).");
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
    setShowMenu(false);
  };

  const saveEdit = useCallback(() => {
    if (!api?.socket || !editText.trim() || !editingId || !isMember) return;
    api.socket.emit("editMessage", { id: editingId, text: editText, channelId }, (response) => {
      if (response?.error) {
        toast.error(response.error);
      } else {
        setEditingId(null);
        setEditText("");
      }
    });
  }, [api, editingId, editText, channelId, isMember]);

  const handleDelete = useCallback((id) => {
    if (!api?.socket || !isMember) return;
    if (window.confirm("Are you sure you want to delete this message?")) {
      api.socket.emit("deleteMessage", { id, channelId }, (response) => {
        if (response?.error) {
          toast.error(response.error);
        }
      });
    }
  }, [api, channelId, isMember]);

  const userDisplayName = user?.displayName || user?.username;

  if (!channelId) {
    return (
      <div className="p-4 text-foreground">
        Invalid channel. Redirecting...
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "connected": return "bg-green-500";
      case "disconnected": return "bg-yellow-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <ToastContainer position="top-right" autoClose={3000} theme={theme} toastClassName="bg-background text-foreground border-border border" progressClassName={theme === "dark" ? "bg-primary" : "bg-primary"} />
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="hidden md:inline">Hi, {userDisplayName}</span>
          <div className="flex items-center space-x-1">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)}`}></span>
            <span className="text-sm opacity-75 hidden md:inline">({connectionStatus})</span>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-primary/90 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-background border border-border text-foreground rounded-md shadow-lg z-10">
              <button onClick={() => setShowOnlineUsers(!showOnlineUsers)} className="block w-full text-left px-4 py-2 hover:bg-muted transition-colors">
                {showOnlineUsers ? "Hide Online Users" : "Show Online Users"}
              </button>
              <button onClick={toggleTheme} className="block w-full text-left px-4 py-2 hover:bg-muted transition-colors">
                Switch to {theme === "light" ? "Dark" : "Light"} Mode
              </button>
              {isMember && (
                <button onClick={leaveChannel} disabled={isOwner} className={`block w-full text-left px-4 py-2 transition-colors ${isOwner ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-destructive hover:text-destructive-foreground text-destructive'}`}>
                  Leave Channel
                </button>
              )}
              {isOwner && (
                <button onClick={handleClearMessages} className="block w-full text-left px-4 py-2 hover:bg-destructive hover:text-destructive-foreground transition-colors text-red-500">
                  Clear All Messages
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {showOnlineUsers && (
        <div className="bg-muted p-4">
          <h3 className="font-bold">Online Users ({onlineUsers.length})</h3>
          <ul className="mt-2 space-y-1">
            {onlineUsers.map((u) => (<li key={u.userId} className="text-sm">{u.displayName || u.username}</li>))}
          </ul>
        </div>
      )}

      {error && (<div className="bg-destructive text-destructive-foreground p-2 text-center">{error}</div>)}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {isLoading && hasMore && (
          <div className="flex items-center justify-center py-2">
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z"></path>
            </svg>
          </div>
        )}
        {messages.length > 0 ? (
          messages.map((msg) => {
            let isOwn = false;
            try {
              isOwn = user?.id && msg.senderId && (msg.senderId.toString() === (typeof user.id === 'string' ? user.id : user.id.toString()));
            } catch (error) {
              isOwn = false;
            }
            return (
              <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`} onMouseEnter={() => setHoveredMessageId(msg._id)} onMouseLeave={() => setHoveredMessageId(null)}>
                <div className={`max-w-lg p-3 rounded-2xl shadow-sm border relative ${isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground border-border"}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold opacity-80">{msg.senderName || (isOwn ? "You" : "Unknown")}</span>
                    <span className="text-xs opacity-70">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("id-ID") : ""}{msg.isEdited && " (edited)"}</span>
                  </div>
                  {msg.image && (
                    <div className="my-2"><img src={msg.image} alt="Message image" className="max-w-full rounded-lg max-h-64 object-cover" /></div>
                  )}
                  {msg.text && (
                    <span className="block text-base whitespace-pre-wrap break-words" style={{ overflowWrap: "break-word" }}>{msg.text}</span>
                  )}
                  {isOwn && (
                    <div className={`absolute top-0 right-0 p-1 flex space-x-1 transition-opacity duration-200 ${hoveredMessageId === msg._id ? 'opacity-100' : 'opacity-0'}`}>
                      <button onClick={() => handleEdit(msg)} className="p-1 rounded-full text-foreground/80 hover:bg-background/20 transition-colors" aria-label="Edit message">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2-8-2-8zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(msg._id)} className="p-1 rounded-full text-foreground/80 hover:bg-background/20 transition-colors" aria-label="Delete message">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {editingId === msg._id && (
                    <div className="flex flex-col space-y-2 mt-2">
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } else if (e.key === "Escape") { setEditingId(null); setEditText(""); } }} className="flex-1 p-2 rounded border-border bg-background text-foreground" autoFocus />
                      <div className="flex space-x-2 self-end">
                        <button onClick={saveEdit} className="bg-primary px-3 py-1 rounded text-primary-foreground text-sm">Save</button>
                        <button onClick={() => { setEditingId(null); setEditText(""); }} className="bg-muted px-3 py-1 rounded text-foreground text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : !isMember ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM12 11a7 7 0 01-7 7v2h14v-2a7 7 0 01-7-7z" />
                </svg>
                <p>You need to join this channel to see messages.</p>
                <button onClick={joinChannel} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Join Channel</button>
            </div>
        ) : (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p>No messages in this channel yet. Start the conversation!</p>
                </div>
            </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {imagePreview && (
        <div className="p-4 bg-muted">
          <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
          <button onClick={() => { setSelectedImage(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="mt-2 text-sm text-destructive">Remove Image</button>
        </div>
      )}

      <div className="p-4 bg-secondary flex justify-between items-center">
        {isMember ? (
          <div className="flex-1">
            {typingUsers.length > 0 && (
              <div className="text-sm text-muted-foreground mb-2">
                {typingUsers.map((u) => u.displayName || u.username).join(", ")} is typing...
              </div>
            )}
            <div className="flex space-x-2">
              <input type="text" value={newMsg} onChange={handleTyping} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }} className="flex-1 p-2 rounded border-border bg-background text-foreground" placeholder="Type a message..." disabled={isUploading} />
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-muted text-foreground rounded-full hover:bg-border transition-colors" disabled={isUploading}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button onClick={sendMessage} className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors" disabled={isUploading || (!newMsg.trim() && !selectedImage)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 text-center">
            <button onClick={joinChannel} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Join Channel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
