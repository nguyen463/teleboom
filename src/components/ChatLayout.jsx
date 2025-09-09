"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import {
  FaSearch,
  FaPaperPlane,
  FaUserCircle,
  FaEllipsisV,
  FaChevronLeft,
  FaRegSmile,
  FaPaperclip,
  FaTrash,
  FaEdit,
  FaBell,
} from "react-icons/fa";

/**
 * Config
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";
const SOCKET_PATH = "/socket.io"; // change if custom

/**
 * Main Chat App — Telegram style
 */
export default function ChatPage() {
  // global state
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null); // { _id, email, username, displayName, avatar }
  const [chats, setChats] = useState([]); // array of chat metadata { chatId, title, lastMessage, unread, participants }
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({}); // { chatId: [msgs...] }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: [userId,...] }
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const msgEndRef = useRef(null);

  // validate token then connect socket
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("chat-app-token");
        const userData = localStorage.getItem("chat-user");
        if (!token || !userData) throw new Error("not logged");

        const parsed = JSON.parse(userData);
        setUser(parsed);

        // validate using backend endpoint
        await axios.get(`${API_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // connect socket with token auth
        const sock = io(API_URL, {
          path: SOCKET_PATH,
          auth: { token },
          transports: ["websocket", "polling"],
        });

        // listeners
        sock.on("connect", () => console.debug("socket connected", sock.id));
        sock.on("disconnect", () => console.debug("socket disconnected"));

        // server should emit initial chat list + last messages and per-chat messages
        sock.on("load_chats", (serverChats) => {
          // serverChats: [{ chatId, title, lastMessage, participants, unread }]
          setChats(serverChats || []);
        });

        sock.on("load_messages", ({ chatId, messages: chatMsgs }) => {
          setMessages((prev) => ({ ...prev, [chatId]: chatMsgs || [] }));
        });

        sock.on("receive_message", (msg) => {
          setMessages((prev) => {
            const c = msg.chatId || "global";
            const arr = prev[c] ? [...prev[c]] : [];
            // avoid duplicates
            if (!arr.find((m) => m._id === msg._id)) arr.push(msg);
            return { ...prev, [c]: arr };
          });
          // update lastMessage in chats
          setChats((prev) =>
            prev.map((ch) =>
              (ch.chatId === msg.chatId) ? { ...ch, lastMessage: msg } : ch
            )
          );
        });

        sock.on("message_updated", (msg) => {
          setMessages((prev) => {
            const c = msg.chatId || "global";
            return {
              ...prev,
              [c]: (prev[c] || []).map((m) => (m._id === msg._id ? msg : m)),
            };
          });
        });

        sock.on("message_deleted", ({ chatId, messageId }) => {
          setMessages((prev) => {
            const c = chatId || "global";
            return {
              ...prev,
              [c]: (prev[c] || []).filter((m) => m._id !== messageId),
            };
          });
        });

        sock.on("online_users", (users) => setOnlineUsers(users || []));
        sock.on("user_typing", ({ chatId, userId }) => {
          setTypingUsers((prev) => {
            const arr = new Set(prev[chatId] || []);
            arr.add(userId);
            return { ...prev, [chatId]: Array.from(arr) };
          });
          // remove typing after short delay (prevent stuck)
          setTimeout(() => {
            setTypingUsers((prev) => {
              const arr = (prev[chatId] || []).filter((id) => id !== userId);
              return { ...prev, [chatId]: arr };
            });
          }, 2500);
        });

        setSocket(sock);
        setLoading(false);
      } catch (err) {
        console.error("Init error:", err);
        localStorage.clear();
        window.location.href = "/login";
      }
    };

    init();

    return () => {
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-scroll when active chat messages change
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatId]);

  // computed filtered chats for sidebar
  const filteredChats = useMemo(() => {
    if (!query) return chats;
    const q = query.toLowerCase();
    return chats.filter((c) => (c.title || "").toLowerCase().includes(q) ||
      (c.lastMessage?.text || "").toLowerCase().includes(q));
  }, [chats, query]);

  // helpers to send typing signals
  const sendTyping = (chatId) => {
    if (!socket) return;
    socket.emit("typing", { chatId });
  };

  // open a chat: set active and request messages if not loaded
  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setIsMobileSidebarOpen(false);
    if (!messages[chatId]) {
      socket.emit("get_messages", { chatId }); // server should respond with load_messages for that chat
    }
  };

  // send message (optimistic)
  const sendMessage = (chatId, text, clearInput) => {
    if (!socket || !text.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      chatId,
      text,
      senderId: user._id || user.id,
      senderName: user.displayName || user.username || "Anda",
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => {
      const arr = prev[chatId] ? [...prev[chatId], tempMsg] : [tempMsg];
      return { ...prev, [chatId]: arr };
    });

    // emit to server
    socket.emit("chat_message", { chatId, text }, (ack) => {
      // ack may contain saved message with real _id
      if (ack && ack.success && ack.message) {
        setMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map((m) =>
            m._id === tempId ? ack.message : m
          ),
        }));
      } else {
        // mark failed
        setMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map((m) =>
            m._id === tempId ? { ...m, status: "failed" } : m
          ),
        }));
      }
    });

    if (typeof clearInput === "function") clearInput();
  };

  // edit message
  const editMessage = (chatId, messageId, newText) => {
    if (!socket) return;
    socket.emit("edit_message", { chatId, id: messageId, newText }, (ack) => {
      // server will broadcast message_updated
    });
  };

  // delete message
  const deleteMessage = (chatId, messageId) => {
    if (!socket) return;
    if (!confirm("Yakin hapus pesan ini?")) return;
    socket.emit("delete_message", { chatId, id: messageId });
  };

  // small components below
  const Avatar = ({ name, size = 9 }) => {
    const initial = (name || "U")[0]?.toUpperCase() || "U";
    const sz = { 7: "w-7 h-7", 9: "w-9 h-9", 12: "w-12 h-12" }[size] || "w-9 h-9";
    return (
      <div className={`rounded-full bg-blue-500 ${sz} flex items-center justify-center text-white font-bold`}>
        {initial}
      </div>
    );
  };

  // Message input component
  const MessageInput = ({ chatId }) => {
    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const ref = useRef(null);

    const submit = () => {
      if (!text.trim()) return;
      setIsSending(true);
      sendMessage(chatId, text.trim(), () => {
        setText("");
        setIsSending(false);
      });
    };

    return (
      <div className="flex items-center gap-2 p-3 bg-white border-t">
        <button className="text-gray-500 hover:text-gray-700"><FaRegSmile /></button>
        <div className="flex-1">
          <input
            ref={ref}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              sendTyping(chatId);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ketik pesan..."
            className="w-full px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={submit}
          disabled={!text.trim() || isSending}
          className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:opacity-60"
        >
          <FaPaperPlane />
        </button>
      </div>
    );
  };

  // Chat bubble rendering
  const MessageBubble = ({ msg }) => {
    const isMe = (msg.senderId === (user._id || user.id));
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}>
        <div className={`max-w-[70%] p-3 rounded-xl ${isMe ? "bg-blue-500 text-white" : "bg-white text-gray-800 border"}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="text-xs font-semibold">{isMe ? "Anda" : msg.senderName || "Anonim"}</div>
            <div className="text-xs opacity-60">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <div className="mt-1 whitespace-pre-wrap">{msg.text}</div>
          {isMe && (
            <div className="flex gap-2 justify-end mt-2 text-xs opacity-80">
              <button onClick={() => {
                const newText = prompt("Edit pesan:", msg.text);
                if (newText && newText !== msg.text) editMessage(msg.chatId || activeChatId, msg._id, newText);
              }} className="hover:underline">Edit</button>
              <button onClick={() => deleteMessage(msg.chatId || activeChatId, msg._id)} className="text-red-500 hover:underline">Hapus</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Chat list item
  const ChatListItem = ({ chat }) => {
    const last = chat.lastMessage;
    return (
      <div
        onClick={() => openChat(chat.chatId)}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 ${activeChatId === chat.chatId ? "bg-gray-100" : ""}`}
      >
        <Avatar name={chat.title || chat.chatId} size={9} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <div className="font-semibold truncate">{chat.title || "Chat"}</div>
            <div className="text-xs opacity-60">{last ? new Date(last.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</div>
          </div>
          <div className="flex justify-between items-center gap-2">
            <div className="text-sm text-gray-500 truncate">{last ? last.text : "Mulai percakapan"}</div>
            {chat.unread > 0 && <div className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{chat.unread}</div>}
          </div>
        </div>
      </div>
    );
  };

  // If still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Memuat chat...</div>
      </div>
    );
  }

  // active chat messages
  const activeMessages = messages[activeChatId] || [];

  return (
    <div className="h-screen flex">
      {/* Left sidebar (contacts/chats) */}
      <aside className={`bg-white border-r w-80 flex flex-col ${isMobileSidebarOpen ? "block" : "hidden md:block"}`}>
        <div className="px-4 py-3 flex items-center gap-3 border-b">
          <Avatar name={user.displayName || user.username} size={12} />
          <div className="flex-1">
            <div className="font-semibold">{user.displayName}</div>
            <div className="text-xs text-gray-500">@{user.username}</div>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden"><FaChevronLeft /></button>
        </div>

        <div className="p-3 border-b">
          <div className="flex items-center bg-gray-100 rounded-full px-3 py-2">
            <FaSearch className="text-gray-500 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredChats.map((chat) => (
            <ChatListItem key={chat.chatId} chat={chat} />
          ))}
          {filteredChats.length === 0 && <div className="p-4 text-gray-500">Tidak ada chat</div>}
        </div>

        <div className="p-3 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FaBell />
              <span>Notifikasi</span>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.href = "/login"; }} className="text-red-500">Logout</button>
          </div>
        </div>
      </aside>

      {/* Main chat panel */}
      <section className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2"><FaChevronLeft /></button>
            {activeChatId ? (
              <>
                <Avatar name={(chats.find(c => c.chatId === activeChatId)?.title) || "Chat"} size={9} />
                <div>
                  <div className="font-semibold">{chats.find(c => c.chatId === activeChatId)?.title || "Chat"}</div>
                  <div className="text-xs text-gray-500">
                    {typingUsers[activeChatId] && typingUsers[activeChatId].length > 0
                      ? `${typingUsers[activeChatId].length} mengetik...`
                      : `${(chats.find(c => c.chatId === activeChatId)?.participants?.length || 1)} anggota`}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="font-semibold">Pilih chat</div>
                <div className="text-xs text-gray-500">Mulai percakapan</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="hidden md:block text-sm">{onlineUsers.length} online</div>
            <div className="hidden md:block">
              <button className="p-2 rounded hover:bg-gray-100"><FaEllipsisV /></button>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!activeChatId ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Pilih chat untuk mulai
            </div>
          ) : (
            <div>
              {activeMessages.map((m) => <MessageBubble key={m._id} msg={m} />)}
              {/* typing indicator */}
              {(typingUsers[activeChatId] || []).length > 0 && (
                <div className="text-sm text-gray-500 italic">{chats.find(c => c.chatId === activeChatId) ? `${typingUsers[activeChatId].length} mengetik...` : ""}</div>
              )}
              <div ref={msgEndRef} />
            </div>
          )}
        </div>

        {/* message input */}
        <div className="bg-white border-t">
          <div className="max-w-4xl mx-auto">
            <MessageInput chatId={activeChatId || "global"} />
          </div>
        </div>
      </section>

      {/* Right info panel (optional) */}
      <aside className="hidden lg:flex w-80 flex-col border-l bg-white">
        <div className="p-4 border-b">
          <div className="font-semibold">Info Chat</div>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-600">Pengguna Online</div>
          <div className="mt-3 space-y-2">
            {onlineUsers.map((id) => (
              <div key={id} className="flex items-center gap-3">
                <Avatar name={id} size={7} />
                <div className="text-sm">{id}</div>
              </div>
            ))}
            {onlineUsers.length === 0 && <div className="text-gray-400 text-sm mt-2">Tidak ada</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}
