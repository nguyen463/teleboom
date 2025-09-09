"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { logout } from "@/app/utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChatLayout({ user }) {
  // ... state declarations tetap sama ...

  useEffect(() => {
    console.log("🔍 USER OBJECT:", user); // Debug user object
    
    // PERBAIKAN: Cek semua kemungkinan property ID yang mungkin ada
    const userId = user?.id || user?._id || user?.userId || user?.userID;
    console.log("🔍 EXTRACTED USER ID:", userId);
    
    const token = localStorage.getItem("chat-app-token");
    if (!token) {
      console.error("No token found");
      return;
    }

    if (!socketRef.current) {
      console.log("🔌 Connecting to socket:", SOCKET_URL);
      socketRef.current = io(SOCKET_URL, { 
        auth: { token },
        transports: ["websocket", "polling"]
      });
    }

    const socket = socketRef.current;

    // Event connection status
    socket.on("connect", () => {
      console.log("✅ Connected to socket server");
      setConnectionStatus("connected");
      socket.emit("getMessages");
    });
    
    // ... rest of socket events tetap sama ...
  }, [user]);

  // ... other functions tetap sama ...

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            className="relative p-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-green-600 rounded-full">
              {onlineUsers.length}
            </span>
          </button>
          <span className="hidden md:inline">Hai, {user?.name || user?.username || 'User'}</span>
          <span className={`h-3 w-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors">Logout</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>Belum ada pesan. Mulai percakapan!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            // PERBAIKAN: Extract user ID dari berbagai kemungkinan property
            const userId = user?.id || user?._id || user?.userId || user?.userID;
            
            // PERBAIKAN: Logic isOwn yang lebih robust
            const isOwn = userId && msg.senderId && 
              (msg.senderId.toString() === userId.toString());

            console.log("🔍 MESSAGE DEBUG:", {
              messageId: msg._id,
              msgSenderId: msg.senderId,
              userId: userId,
              isOwn: isOwn,
              userObject: user // Log seluruh user object untuk debugging
            });

            return (
              <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-lg p-3 rounded-2xl shadow-sm ${isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-900 border"}`}>
                  {editingId === msg._id ? (
                    <div className="flex flex-col space-y-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyPress}
                        className="flex-1 p-2 rounded border text-black"
                        autoFocus
                      />
                      <div className="flex space-x-2 self-end">
                        <button onClick={saveEdit} className="bg-green-500 px-3 py-1 rounded text-white text-sm">Simpan</button>
                        <button onClick={() => { setEditingId(null); setEditText(""); }} className="bg-gray-400 px-3 py-1 rounded text-white text-sm">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold opacity-80">{msg.senderName}</span>
                        <span className="text-xs opacity-70">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                          {msg.updatedAt && ' (diedit)'}
                        </span>
                      </div>

                      {msg.image && (
                        <div className="my-2">
                          <img src={msg.image} alt="Gambar pesan" className="max-w-full rounded-lg max-h-64 object-cover" />
                        </div>
                      )}

                      {msg.text && <span className="block text-base">{msg.text}</span>}

                      {/* Tombol edit/hapus hanya muncul untuk pesan milik sendiri */}
                      <div className={`flex space-x-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {isOwn && (
                          <>
                            <button 
                              onClick={() => handleEdit(msg)} 
                              className="text-xs text-blue-100 hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(msg._id)} 
                              className="text-xs text-red-300 hover:text-red-500 transition-colors"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* ... rest of the component tetap sama ... */}
    </div>
  );
}
