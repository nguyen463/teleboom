"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId, logout }) {
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
  const [theme, setTheme] = useState("light"); // State untuk tema

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const router = useRouter();

  // Inisialisasi tema dari localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // Toggle tema
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Reset everything when channelId changes
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

  // Normalize message data
  const normalizeMessage = useCallback(
    (msg) => {
      const senderIdStr = msg.senderId?._id 
        ? msg.senderId._id.toString() 
        : (typeof msg.senderId === 'string' ? msg.senderId : '');
      
      return {
        ...msg,
        _id: msg._id?.toString() || Math.random().toString(),
        senderId: senderIdStr,
        channelId: msg.channelId?.toString() || "",
        senderName: msg.senderId?.displayName || msg.senderId?.username || "Unknown"
      };
    },
    []
  );

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize socket and handle events
  useEffect(() => {
    if (!user?.token || !channelId) {
      setError("Token or channelId not found. Redirecting...");
      setIsLoading(false);
      setTimeout(() => router.push("/channels"), 2000);
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

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
      setIsLoading(true);
      console.log("🔗 Socket connected, ID:", socket.id);
      socket.emit("joinChannel", channelId);
      
      socket.emit("getMessages", { channelId, limit: 20, skip: 0 }, (response) => {
        if (response && response.error) {
          toast.error(response.error);
          setError(response.error);
          setIsLoading(false);
        } else if (Array.isArray(response)) {
          const normalizedMessages = response.map(normalizeMessage);
          setMessages(normalizedMessages);
          setPage(0);
          setHasMore(response.length === 20);
          setIsLoading(false);
          setTimeout(() => scrollToBottom(), 100);
        } else {
          toast.error("Invalid response format");
          setError("Invalid response format");
          setIsLoading(false);
        }
      });
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");
      setError("Disconnected from server. Attempting to reconnect...");
      console.log("🔍 Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      setConnectionStatus("error");
      setError("Connection failed: " + err.message);
      setIsLoading(false);
      toast.error("Connection failed: " + err.message);
    });

    socket.on("newMessage", (msg) => {
      if (msg.channelId.toString() === channelId) {
        const container = messagesContainerRef.current;
        const isScrolledToBottom = container && 
          (container.scrollHeight - container.clientHeight <= container.scrollTop + 50);
        
        setMessages((prev) => [...prev, normalizeMessage(msg)]);
        
        if (isScrolledToBottom) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    });

    socket.on("editMessage", (msg) => {
      if (msg.channelId.toString() === channelId) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? normalizeMessage(msg) : m))
        );
        setEditingId(null);
        setEditText("");
      }
    });

    socket.on("deleteMessage", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id.toString()));
    });

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("userTyping", (userData) => {
      if (userData.userId !== user.id) {
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== userData.userId);
          return userData.isTyping ? [...filtered, userData] : filtered;
        });
      }
    });

    socket.on("error", (errorMsg) => {
      toast.error(`Error: ${errorMsg.message || errorMsg}`);
      if (errorMsg.includes("authentication") || errorMsg.includes("token")) {
        logout();
      } else if (errorMsg.includes("channel")) {
        router.push("/channels");
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveChannel", channelId);
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, channelId, router, normalizeMessage, logout, scrollToBottom]);

  // Infinite scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !isLoading) {
        setIsLoading(true);
        const oldScrollHeight = container.scrollHeight;
        const newSkip = (page + 1) * 20;
        
        socketRef.current?.emit("getMessages", { channelId, limit: 20, skip: newSkip }, (response) => {
          if (response?.error) {
            setIsLoading(false);
            return;
          }
          
          if (Array.isArray(response)) {
            const newMessages = response.map(normalizeMessage);
            setMessages((prev) => [...newMessages, ...prev]);
            setHasMore(response.length === 20);
            setPage((prev) => prev + 1);
            
            setTimeout(() => {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - oldScrollHeight;
              setIsLoading(false);
            }, 0);
          } else {
            setIsLoading(false);
          }
        });
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, page, channelId, normalizeMessage]);

  const sendMessage = useCallback(() => {
    if (!socketRef.current || (!newMsg.trim() && !selectedImage) || isUploading) return;
    setIsUploading(true);

    const messageData = { text: newMsg.trim(), channelId };

    const onMessageSent = (response) => {
      if (response?.error) {
        setError(response.error);
        toast.error(response.error);
      } else {
        setNewMsg("");
        setSelectedImage(null);
        setImagePreview(null);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        socketRef.current.emit("typing", { channelId, isTyping: false });
      }
      setIsUploading(false);
    };

    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        messageData.image = e.target.result;
        socketRef.current.emit("sendMessage", messageData, onMessageSent);
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
        toast.error("Failed to read image file.");
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedImage);
    } else {
      socketRef.current.emit("sendMessage", messageData, onMessageSent);
    }
  }, [newMsg, selectedImage, isUploading, channelId]);

  const handleTyping = useCallback(
    (e) => {
      const value = e.target.value;
      setNewMsg(value);
      
      if (!socketRef.current) return;
      
      socketRef.current.emit("typing", { 
        channelId, 
        isTyping: value.length > 0 
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      if (value.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit("typing", { 
            channelId, 
            isTyping: false 
          });
        }, 3000);
      }
    },
    [channelId]
  );

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large (max 5MB).");
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
  };

  const saveEdit = useCallback(() => {
    if (!socketRef.current || !editText.trim() || !editingId) return;
    
    socketRef.current.emit("editMessage", { 
      id: editingId, 
      text: editText, 
      channelId 
    }, (response) => {
      if (response?.error) {
        toast.error(response.error);
      } else {
        setEditingId(null);
        setEditText("");
      }
    });
  }, [editingId, editText, channelId]);

  const handleDelete = useCallback(
    (id) => {
      if (!socketRef.current) return;
      
      if (window.confirm("Are you sure you want to delete this message?")) {
        socketRef.current.emit("deleteMessage", { 
          id, 
          channelId 
        }, (response) => {
          if (response?.error) {
            toast.error(response.error);
          }
        });
      }
    },
    [channelId]
  );

  const userDisplayName = user?.displayName || user?.username;

  if (!channelId) {
    return (
      <div className="p-4 text-secondary-foreground">
        Invalid channel. Redirecting...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <ToastContainer position="top-right" autoClose={3000} />
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="hidden md:inline">Hi, {userDisplayName}</span>
          <span className="text-sm opacity-75">({connectionStatus})</span>
          <span className="text-sm opacity-75">Channel: {channelId}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-primary-foreground hover:text-primary transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-secondary text-secondary-foreground rounded-md shadow-lg z-10">
              <button
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                className="block w-full text-left px-4 py-2 hover:bg-secondary-foreground hover:text-secondary transition-colors"
              >
                {showOnlineUsers ? "Hide Online Users" : "Show Online Users"}
              </button>
              <button
                onClick={toggleTheme}
                className="block w-full text-left px-4 py-2 hover:bg-secondary-foreground hover:text-secondary transition-colors"
              >
                Switch to {theme === "light" ? "Dark" : "Light"} Mode
              </button>
              <button
                onClick={() => {
                  logout();
                }}
                className="block w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {showOnlineUsers && (
        <div className="bg-secondary p-4">
          <h3 className="font-bold">Online Users ({onlineUsers.length})</h3>
          <ul className="mt-2 space-y-1">
            {onlineUsers.map((u) => (
              <li key={u.userId} className="text-sm">
                {u.displayName || u.username}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-500 text-white p-2 text-center">{error}</div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-background"
      >
        {isLoading && page === 0 ? (
          <div className="flex items-center justify-center h-full">
            <svg
              className="animate-spin h-8 w-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z"
              ></path>
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-secondary-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p>No messages in this channel yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = user?.id && msg.senderId && 
              msg.senderId.toString() === (typeof user.id === 'string' ? user.id : user.id.toString());
            console.log('Debug ID:', {
              userId: user?.id,
              senderId: msg.senderId,
              isOwn
            });
            return (
              <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-lg p-3 rounded-2xl shadow-sm ${
                    isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold opacity-80">
                      {msg.senderName || (isOwn ? "You" : "Unknown")}
                    </span>
                    <span className="text-xs opacity-70">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("id-ID") : ""}
                      {msg.updatedAt && " (edited)"}
                    </span>
                  </div>
                  {msg.image && (
                    <div className="my-2">
                      <img
                        src={msg.image}
                        alt="Message image"
                        className="max-w-full rounded-lg max-h-64 object-cover"
                      />
                    </div>
                  )}
                  {msg.text && <span className="block text-base">{msg.text}</span>}
                  {editingId === msg._id ? (
                    <div className="flex flex-col space-y-2 mt-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit();
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                            setEditText("");
                          }
                        }}
                        className="flex-1 p-2 rounded border text-secondary-foreground bg-background"
                        autoFocus
                      />
                      <div className="flex space-x-2 self-end">
                        <button
                          onClick={saveEdit}
                          className="bg-green-500 px-3 py-1 rounded text-white text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                          className="bg-gray-400 px-3 py-1 rounded text-white text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    isOwn && (
                      <div className="flex space-x-2 mt-1 justify-end edit-delete-buttons">
                        <button
                          onClick={() => handleEdit(msg)}
                          className="text-xs text-primary-foreground underline hover:text-blue-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="text-xs text-red-300 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {imagePreview && (
        <div className="p-4 bg-secondary">
          <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
          <button
            onClick={() => {
              setSelectedImage(null);
              setImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="mt-2 text-sm text-red-600"
          >
            Remove Image
          </button>
        </div>
      )}

      <div className="p-4 bg-secondary">
        {typingUsers.length > 0 && (
          <div className="text-sm text-secondary-foreground mb-2">
            {typingUsers.map((u) => u.displayName || u.username).join(", ")} is typing...
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-secondary-foreground text-secondary rounded-full hover:bg-gray-400 transition-colors"
            disabled={isUploading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            type="text"
            value={newMsg}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-2 rounded border text-secondary-foreground bg-background"
            placeholder="Type a message..."
            disabled={isUploading}
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-blue-700 transition-colors"
            disabled={isUploading || (!newMsg.trim() && !selectedImage)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
