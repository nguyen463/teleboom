"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeContext";
import axios from "axios";
import { toast } from "react-toastify";
import Link from "next/link";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

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

  // Initialize socket
  useEffect(() => {
    if (!user?.token) return;
    const socket = io(SOCKET_URL, { auth: { token: user.token } });
    socketRef.current = socket;

    socket.on("channelCreated", (newChannel) => {
      setChannelList((prev) => {
        if (prev.some((c) => c._id === newChannel._id)) return prev;
        return [...prev, newChannel];
      });
    });

    return () => socket.disconnect();
  }, [user?.token]);

  // Update channel list if channels prop changes
  useEffect(() => {
    setChannelList(channels);
  }, [channels]);

  // Click outside menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setShowMenu(false);
        setShowAddMenu(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleCreateChannel = async () => {
    if (channelList.find((c) => c.owner?._id === user.id)) {
      toast.error("❌ Anda hanya bisa membuat 1 channel");
      return;
    }
    const name = prompt("Masukkan nama channel:");
    if (!name) return;
    try {
      const token = localStorage.getItem("token");
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
      toast.error(err.response?.data?.message || "Gagal membuat channel");
    }
  };

  const handleCreateDM = async () => {
    const otherUserId = prompt("Masukkan user ID untuk DM:");
    if (!otherUserId) return;
    if (!socketRef.current) return;

    socketRef.current.emit("startDm", otherUserId, (res) => {
      if (res.success) {
        setChannelList((prev) => {
          if (prev.some((c) => c._id === res.channelId)) return prev;
          return [...prev, { _id: res.channelId, isPrivate: true, members: [user.id, otherUserId] }];
        });
        onSelectChannel(res.channelId);
        toast.success("💬 DM berhasil dibuat!");
      } else {
        toast.error(res.error || "Gagal memulai DM");
      }
    });
  };

  const channelButtons = useMemo(
    () =>
      Array.isArray(channelList)
        ? channelList.map((channel) => {
            const channelId = channel._id;
            const isSelected = channelId === selectedChannelId;
            const isOwner = channel?.owner?._id === user.id;

            const isDM = channel.isPrivate || channel.type === "dm" || channel.channelType === "dm";
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
                >
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
                  <div className="font-medium truncate">{isDM ? channelName : `#${channelName}`}</div>
                </button>

                {isOwner && hoveredChannelId === channelId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannel(channelId);
                    }}
                    className="absolute right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })
        : [],
    [channelList, selectedChannelId, hoveredChannelId]
  );

  return (
    <div className="h-full flex flex-col bg-secondary text-foreground">
      {/* Navbar */}
      <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-secondary z-10">
        <h2 className="text-lg font-semibold">Channels</h2>

        <div className="flex items-center space-x-2">
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(!showAddMenu);
              }}
              className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <span className="text-xl">+</span>
            </button>
            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg py-1 z-20">
                <button onClick={handleCreateChannel} className="block px-4 py-2 w-full text-left hover:bg-muted">
                  Create New Channel
                </button>
                <button onClick={handleCreateDM} className="block px-4 py-2 w-full text-left hover:bg-muted">
                  Start DM
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full border"
            >
              <img src={user.avatarUrl || "/default-avatar.png"} className="w-6 h-6 rounded-full" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg py-1 z-20">
                <Link href="/profile" className="block px-4 py-2 hover:bg-muted">Profile</Link>
                <button onClick={onLogout} className="block px-4 py-2 hover:bg-red-100 w-full text-left">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center items-center h-20">Loading...</div>
        ) : channelList.length === 0 ? (
          <div className="text-center text-muted-foreground">No channels yet.</div>
        ) : (
          <div className="space-y-1">{channelButtons}</div>
        )}
      </div>
    </div>
  );
}
