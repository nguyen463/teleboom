"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user, channelId, logout }) {
  // State declarations remain the same
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
  const [theme, setTheme] = useState("light");
  const [forceUpdate, setForceUpdate] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const router = useRouter();

  // Theme management - now only applies to chat room
  useEffect(() => {
    const savedTheme = localStorage.getItem("chat-theme") || "light";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("chat-theme", newTheme);
    setForceUpdate(prev => prev + 1);
  };

  // Rest of the logic remains the same until the return statement

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      <style jsx>{`
        .light-theme {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-muted: #e9ecef;
          --bg-destructive: #dc3545;
          --text-primary: #212529;
          --text-secondary: #495057;
          --text-muted: #6c757d;
          --text-destructive: #ffffff;
          --border-color: #dee2e6;
          --accent-color: #007bff;
          --accent-hover: #0056b3;
          --online-indicator: #28a745;
        }
        
        .dark-theme {
          --bg-primary: #1a1a1a;
          --bg-secondary: #2d2d2d;
          --bg-muted: #3d3d3d;
          --bg-destructive: #dc3545;
          --text-primary: #f8f9fa;
          --text-secondary: #e9ecef;
          --text-muted: #adb5bd;
          --text-destructive: #ffffff;
          --border-color: #495057;
          --accent-color: #4dabf7;
          --accent-hover: #339af0;
          --online-indicator: #51cf66;
        }
        
        .chat-container {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }
        
        .chat-header {
          background-color: var(--accent-color);
          color: white;
        }
        
        .chat-online-users {
          background-color: var(--bg-muted);
          color: var(--text-primary);
        }
        
        .chat-input-area {
          background-color: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
        }
        
        .message-bubble {
          max-width: 70%;
          padding: 0.75rem;
          border-radius: 1rem;
          margin-bottom: 0.5rem;
          position: relative;
        }
        
        .message-own {
          background-color: var(--accent-color);
          color: white;
          margin-left: auto;
        }
        
        .message-other {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }
        
        .typing-indicator {
          display: inline-block;
          position: relative;
          width: 10px;
          height: 10px;
          margin-right: 4px;
          border-radius: 50%;
          background-color: var(--accent-color);
          animation: typingAnimation 1.4s infinite ease-in-out both;
        }
        
        .typing-indicator:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typingAnimation {
          0%, 80%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .connection-status {
          display: inline-flex;
          align-items: center;
          font-size: 0.75rem;
          margin-left: 0.5rem;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
        }
        
        .connected {
          background-color: var(--online-indicator);
        }
        
        .connecting {
          background-color: #ffc107;
        }
        
        .disconnected {
          background-color: var(--bg-destructive);
        }
        
        .menu-button {
          transition: all 0.2s;
        }
        
        .menu-button:hover {
          transform: rotate(90deg);
        }
        
        .scroll-top-loading {
          text-align: center;
          padding: 10px;
          color: var(--text-muted);
        }
      `}</style>

      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        theme={theme}
        toastClassName="bg-background text-foreground border-border border"
        progressClassName={theme === "dark" ? "bg-primary" : "bg-primary"}
      />
      
      <header className="chat-header p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-2">
          <div className="flex flex-col">
            <span className="font-semibold">Hi, {userDisplayName}</span>
            <span className="text-xs opacity-85 flex items-center">
              <span className={`status-dot ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'connecting' ? 'connecting' : 'disconnected'}`}></span>
              {connectionStatus}
              <span className="ml-2">Channel: {channelId}</span>
            </span>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="menu-button p-2 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors"
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
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                className="block w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
              >
                {showOnlineUsers ? "Hide Online Users" : "Show Online Users"}
              </button>
              <button
                onClick={toggleTheme}
                className="block w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
              >
                Switch to {theme === "light" ? "Dark" : "Light"} Mode
              </button>
              <button
                onClick={() => {
                  logout();
                }}
                className="block w-full text-left px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900 transition-colors text-red-600 dark:text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {showOnlineUsers && (
        <div className="chat-online-users p-4 border-b border-border">
          <h3 className="font-bold flex items-center">
            Online Users ({onlineUsers.length})
            <span className="w-2 h-2 bg-green-500 rounded-full ml-2"></span>
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {onlineUsers.map((u) => (
              <span key={u.userId} className="bg-accent-color bg-opacity-20 text-xs px-2 py-1 rounded-full">
                {u.displayName || u.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive text-destructive-foreground p-3 text-center">{error}</div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-container"
      >
        {isLoading && page === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-color"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto mb-4 text-accent-color opacity-50"
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
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation by sending a message!</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="scroll-top-loading">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-accent-color mr-2"></div>
                Loading earlier messages...
              </div>
            )}
            
            {messages.map((msg) => {
              let isOwn = false;
              try {
                isOwn = user?.id && msg.senderId && 
                  msg.senderId.toString() === (typeof user.id === 'string' ? user.id : user.id.toString());
              } catch (error) {
                console.error("Error checking message ownership:", error, msg, user);
                isOwn = false;
              }
              
              return (
                <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`message-bubble ${isOwn ? "message-own" : "message-other"}`}
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
                          className="max-w-full rounded-lg max-h-64 object-cover shadow-sm"
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
                          className="flex-1 p-2 rounded border-border bg-background text-foreground"
                          autoFocus
                        />
                        <div className="flex space-x-2 self-end">
                          <button
                            onClick={saveEdit}
                            className="bg-accent-color px-3 py-1 rounded text-white text-sm hover:bg-accent-hover transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditText("");
                            }}
                            className="bg-muted px-3 py-1 rounded text-foreground text-sm hover:bg-muted-hover transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      isOwn && (
                        <div className="flex space-x-2 mt-3 justify-end">
                          <button
                            onClick={() => handleEdit(msg)}
                            className="text-xs bg-background text-foreground px-2 py-1 rounded hover:bg-accent transition-colors opacity-70 hover:opacity-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(msg._id)}
                            className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded hover:bg-destructive/90 transition-colors opacity-70 hover:opacity-100"
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {imagePreview && (
        <div className="p-4 bg-muted border-t border-border">
          <div className="flex items-center">
            <img src={imagePreview} alt="Preview" className="max-h-20 rounded-lg shadow-sm" />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="ml-3 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="chat-input-area p-4">
        {typingUsers.length > 0 && (
          <div className="text-sm text-muted-foreground mb-2 flex items-center">
            <div className="flex mr-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="typing-indicator"></div>
              ))}
            </div>
            {typingUsers.map((u) => u.displayName || u.username).join(", ")} is typing...
          </div>
        )}
        
        <div className="flex space-x-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-muted text-foreground rounded-full hover:bg-border transition-colors flex-shrink-0"
            disabled={isUploading}
            title="Attach image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
            className="flex-1 p-3 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent-color"
            placeholder="Type a message..."
            disabled={isUploading}
          />
          
          <button
            onClick={sendMessage}
            className="p-3 bg-accent-color text-white rounded-full hover:bg-accent-hover transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading || (!newMsg.trim() && !selectedImage)}
            title="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
