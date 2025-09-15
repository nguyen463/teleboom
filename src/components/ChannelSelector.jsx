"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeContext";
import axios from "axios";
import { toast } from "react-toastify";
import Link from "next/link";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function ChannelSelector({
  user,
  channels = [],
  loading = false,
  selectedChannelId,
  onSelectChannel,
  onRefetch,
  onLogout,
  onDeleteChannel,
  error,
}) {
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hoveredChannelId, setHoveredChannelId] = useState(null);
  const [channelList, setChannelList] = useState(channels);
  const socketRef = useRef(null);
  const menuRef = useRef(null);
  const addMenuRef = useRef(null);
  const router = useRouter();

  // Initialize Socket.io
  useEffect(() => {
    if (!user?.token) return;
    const socket = io(SOCKET_URL, { auth: { token: user.token } });
    socketRef.current = socket;

    // Update channels if server emits new DM or channel
    socket.on("channelCreated", (newChannel) => {
      setChannelList((prev) => {
        if (prev.some((c) => c._id === newChannel._id)) return prev;
        return [...prev, newChannel];
      });
    });

    return () => socket.disconnect();
  }, [user?.token]);

  // Update channelList if channels prop changes
  useEffect(() => {
    setChannelList(channels);
  }, [channels]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setShowAddMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key handler
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowMenu(false);
        setShowAddMenu(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // ✅ Create new channel (1 per user)
  const handleCreateChannel = async () => {
    if (channelList.find((c) => c.owner?._id === user.id)) {
      toast.error("❌ Anda hanya bisa membuat 1 channel");
      return;
    }

    const name = prompt("Masukkan nama channel:");
    if (!name) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("❌ Token tidak ditemukan. Silakan login ulang.");
        router.push("/login");
        return;
      }

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/channels`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 201) {
        toast.success("✅ Channel berhasil dibuat!");
        if (onRefetch) onRefetch();
      }
    } catch (err) {
      console.error("❌ Error create channel:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Gagal membuat channel");
    }
  };

  // ✅ Start DM using socket
  const handleCreateDM = (otherUserId) => {
    if (!socketRef.current || !otherUserId) return;
    socketRef.current.emit("startDm", otherUserId, (res) => {
      if (res.success) {
        // tambahkan DM baru ke channelList jika belum ada
        setChannelList((prev) => {
          if (prev.some((c) => c._id === res.channelId)) return prev;
          return [...prev, { _id: res.channelId, isPrivate: true, members: [user.id, otherUserId] }];
        });
        onSelectChannel(res.channelId);
        toast.success("💬 DM channel berhasil dibuat!");
      } else {
        toast.error(res.error || "Gagal memulai DM");
      }
    });
  };

  // Channel buttons
  const channelButtons = useMemo(
    () =>
      Array.isArray(channelList)
        ? channelList.map((channel) => {
            const channelId = channel?._id || channel?.id;
            const isSelected = channelId === selectedChannelId;
            const channelOwnerId = channel?.owner?._id || channel?.owner;
            const isOwner = channelOwnerId && user?.id === String(channelOwnerId);

            // ✅ Aman untuk DM, cek berbagai kemungkinan properti
            const isDM =
              Boolean(channel.isPrivate) ||
              Boolean(channel.private) ||
              channel.type === "dm" ||
              channel.channelType === "dm";

            const channelName = isDM
              ? channel.members?.find((m) => m._id !== user.id)?.displayName || "Direct Message"
              : channel.name || "Unnamed";

            return (
              <div
                key={channelId}
                className="relative flex items-center group"
                onMouseEnter={() => setHoveredChannelId(channelId)}
                onMouseLeave={() => setHoveredChannelId(null)}
              >
                <button
                  onClick={() => onSelectChannel(channelId)}
                  className={`flex-1 flex items-center gap-2 text-left p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                  aria-selected={isSelected}
                  aria-label={`Select channel ${channelName}${
                    channel?.description ? ` - ${channel.description}` : ""
                  }`}
                >
                  {/* DM Icon */}
                  {isDM && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-blue-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h8m-8 4h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}

                  {/* Channel Name */}
                  <div className="font-medium truncate">{isDM ? channelName : `#${channelName}`}</div>

                  {channel?.lastMessage?.text && (
                    <div className="text-xs opacity-75 truncate">{channel.lastMessage.text}</div>
                  )}
                </button>

                {isOwner && hoveredChannelId === channelId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannel(channelId);
                    }}
                    className="absolute right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Delete channel ${channel?.name ?? ""}`}
                    title={`Delete channel ${channel?.name ?? ""}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.013 21H7.987a2 2 0 01-1.92-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        : [],
    [channelList, selectedChannelId, onSelectChannel, onDeleteChannel, user, hoveredChannelId]
  );

  // Rest of your JSX (navbar, channel list rendering, etc.) tetap sama
  return (
    <div className="h-full flex flex-col bg-secondary text-foreground">
      {/* Navbar & Add Channel/DM & Profile Dropdown */}
      {/* ...sama persis seperti kode lo sebelumnya... */}

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Channel list">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-destructive-foreground bg-destructive/10 rounded-md text-sm" role="alert">
            {typeof error === "string" ? error : "An unexpected error occurred"}
          </div>
        ) : channelList.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No channels yet. Click the + button to create the first channel.
          </div>
        ) : (
          <div className="space-y-1" role="list">
            {channelButtons}
          </div>
        )}
      </div>
    </div>
  );
}
