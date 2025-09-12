"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import {
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaPaperPlane,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaUsers,
  FaImage,
  FaSpinner,
} from "react-icons/fa";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [theme, setTheme] = useState("light");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Create a custom logout function
  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Redirect to login
    router.push("/login");
  };

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get theme from localStorage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  // 🔧 Reset state when channel changes
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

  // 🎛️ Setup socket - Fixed userId issue
  useEffect(() => {
    if (!user || !channelId) return;

    // Make sure we have a valid user ID
    const userId = user._id || user.id;
    if (!userId) {
      setError("User ID is missing");
      return;
    }

    const socket = io(SOCKET_URL, {
      query: { userId, channelId },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("getMessages", { channelId, page: 0 });

    socket.on("messages", (data) => {
      setMessages((prev) => [...data.reverse(), ...prev]);
      setHasMore(data.length === 10); // Assuming 10 messages per page
      setIsLoading(false);
      
      // Scroll to bottom after initial load
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    });

    socket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setIsSending(false);
      scrollToBottom();
    });

    socket.on("messageEdited", (msg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, text: msg.text, isEdited: true } : m))
      );
    });

    socket.on("messageDeleted", (msgId) => {
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    });

    socket.on("typing", (userData) => {
      if (userData._id !== userId) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u._id === userData._id)) return prev;
          return [...prev, userData];
        });
        
        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        // Set timeout to remove typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u._id !== userData._id));
        }, 3000);
      }
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("error", (err) => {
      setError(err.message);
      setIsSending(false);
    });

    return () => {
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, channelId]);

  // 🔽 Load older messages (infinite scroll)
  const loadMore = useCallback(() => {
    if (!socketRef.current || !hasMore || isLoading) return;
    setIsLoading(true);
    const nextPage = page + 1;
    socketRef.current.emit("getMessages", { channelId, page: nextPage });
    setPage(nextPage);
  }, [page, hasMore, channelId, isLoading]);

  // ⌨️ Typing indicator
  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { channelId, user });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // 📨 Send message - FIXED
  const sendMessage = async () => {
    if ((!newMsg.trim() && !selectedImage) || isSending) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      // If there's an image, convert it to base64
      let imageBase64 = null;
      if (selectedImage) {
        imageBase64 = await convertToBase64(selectedImage);
      }
      
      socketRef.current.emit("sendMessage", {
        channelId,
        text: newMsg.trim(),
        image: imageBase64,
      });
      
      setNewMsg("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err) {
      setError("Gagal mengirim pesan");
      setIsSending(false);
    }
  };

  // Helper function to convert file to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle key press for sending message
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 📝 Edit message
  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    socketRef.current.emit("editMessage", {
      messageId: editingId,
      newText: editText.trim(),
    });
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // ❌ Delete message
  const deleteMessage = (msgId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pesan ini?")) {
      socketRef.current.emit("deleteMessage", { messageId: msgId });
    }
  };

  // 📷 Upload image
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith("image/")) {
        setError("File harus berupa gambar");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Ukuran gambar tidak boleh lebih dari 5MB");
        return;
      }
      
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div
      className={`flex flex-col h-screen transition-colors duration-200 ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${
        theme === "dark" ? "bg-gray-800" : "bg-blue-600 text-white"
      }`}>
        <h2 className="font-bold text-lg">Channel {channelId}</h2>
        <div className="flex space-x-4 items-center">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </button>
          <div className="flex items-center space-x-2">
            <FaUsers />
            <span>{onlineUsers.length} Online</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition"
            aria-label="Logout"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className={`p-2 text-center ${
          theme === "dark" ? "bg-red-800" : "bg-red-100 text-red-800"
        }`}>
          {error}
        </div>
      )}

      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          // Load more when scrolled to top
          if (scrollTop === 0 && hasMore && !isLoading) {
            loadMore();
          }
        }}
      >
        {isLoading && page === 0 ? (
          <div className="flex justify-center items-center h-32">
            <FaSpinner className="animate-spin text-2xl" />
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoading}
                className={`mx-auto block px-4 py-2 rounded-full text-sm ${
                  theme === "dark" 
                    ? "bg-gray-700 hover:bg-gray-600" 
                    : "bg-gray-300 hover:bg-gray-400"
                } ${isLoading ? "opacity-50" : ""}`}
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : "Load more"}
              </button>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Tidak ada pesan. Mulai percakapan!
              </div>
            ) : (
              messages.map((msg) => {
                const userId = user?._id || user?.id;
                const senderId = msg.senderId?._id || msg.senderId;
                const isOwn = userId && senderId && senderId.toString() === userId.toString();

                return (
                  <div
                    key={msg._id}
                    className={`p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg ${
                      isOwn
                        ? (theme === "dark" ? "bg-blue-700 ml-auto" : "bg-blue-100 ml-auto")
                        : (theme === "dark" ? "bg-gray-800 mr-auto" : "bg-white mr-auto")
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-semibold text-sm ${
                        isOwn 
                          ? (theme === "dark" ? "text-blue-200" : "text-blue-700")
                          : (theme === "dark" ? "text-purple-400" : "text-purple-600")
                      }`}>
                        {msg.senderId?.username || "Unknown"}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatTime(msg.timestamp || msg.createdAt)}
                      </span>
                    </div>
                    
                    {editingId === msg._id ? (
                      <div className="mb-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className={`w-full border rounded p-2 mb-2 ${
                            theme === "dark" 
                              ? "bg-gray-700 border-gray-600 text-white" 
                              : "bg-white border-gray-300"
                          }`}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 bg-green-500 text-white rounded flex items-center"
                          >
                            <FaCheck className="mr-1" /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-500 text-white rounded flex items-center"
                          >
                            <FaTimes className="mr-1" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.text && <p className="mb-2 break-words">{msg.text}</p>}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Uploaded content"
                            className="mt-2 rounded max-h-48 object-contain"
                          />
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between items-center mt-1">
                      {msg.isEdited && (
                        <span className="text-xs opacity-70">(edited)</span>
                      )}
                      
                      {isOwn && !editingId && (
                        <div className="flex space-x-2 ml-auto">
                          <button
                            onClick={() => startEdit(msg)}
                            className="text-yellow-500 hover:text-yellow-600"
                            aria-label="Edit message"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className="text-red-500 hover:text-red-600"
                            aria-label="Delete message"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className={`px-4 py-2 text-sm italic ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        }`}>
          {typingUsers.map((u) => u.username).join(", ")} sedang mengetik...
        </div>
      )}

      {/* Input area */}
      <div className={`p-3 border-t ${
        theme === "dark" 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-300"
      }`}>
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-16 h-16 object-cover rounded"
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              aria-label="Remove image"
            >
              <FaTimes size={10} />
            </button>
          </div>
        )}
        
        <div className="flex space-x-2 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="fileInput"
            ref={fileInputRef}
          />
          <label
            htmlFor="fileInput"
            className={`cursor-pointer p-2 rounded-full ${
              theme === "dark" 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            aria-label="Attach image"
          >
            <FaImage />
          </label>
          
          <div className="flex-1 relative">
            <textarea
              value={editingId ? editText : newMsg}
              onChange={(e) =>
                editingId ? setEditText(e.target.value) : setNewMsg(e.target.value)
              }
              onKeyDown={(e) => {
                if (!editingId) handleKeyPress(e);
                handleTyping();
              }}
              placeholder="Ketik pesan..."
              rows={1}
              className={`w-full border rounded-2xl py-2 px-4 pr-10 resize-none ${
                theme === "dark" 
                  ? "bg-gray-700 border-gray-600 text-white" 
                  : "bg-white border-gray-300"
              }`}
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          
          <button
            onClick={editingId ? saveEdit : sendMessage}
            disabled={isSending || (!newMsg.trim() && !selectedImage && !editingId)}
            className={`p-3 rounded-full flex items-center justify-center ${
              isSending || (!newMsg.trim() && !selectedImage && !editingId)
                ? "bg-gray-400 cursor-not-allowed"
                : theme === "dark" 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            aria-label={editingId ? "Save changes" : "Send message"}
          >
            {isSending ? (
              <FaSpinner className="animate-spin" />
            ) : editingId ? (
              <FaCheck />
            ) : (
              <FaPaperPlane />
            )}
          </button>
          
          {editingId && (
            <button
              onClick={cancelEdit}
              className={`p-3 rounded-full ${
                theme === "dark" 
                  ? "bg-gray-700 hover:bg-gray-600" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              aria-label="Cancel edit"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
