"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeContext";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const menuRef = useRef(null);
  const addMenuRef = useRef(null);
  const router = useRouter();

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

  // Check if user already has a public channel
  const userHasChannel = useMemo(() => {
    return channels.some(
      (ch) => !ch.isPrivate && String(ch.owner?._id || ch.owner) === String(user?.id)
    );
  }, [channels, user]);

  // Create new channel
  const handleCreateChannel = async () => {
    if (userHasChannel) {
      toast.error("❌ Kamu sudah memiliki satu channel publik.");
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

  // Start DM
  const handleCreateDM = () => {
    toast.info("🚧 Fitur Start DM belum diimplementasikan");
  };

  // Channel buttons
  const channelButtons = useMemo(
    () =>
      Array.isArray(channels)
        ? channels.map((channel) => {
            const channelId = channel?._id || channel?.id;
            const isSelected = channelId === selectedChannelId;
            const channelOwnerId = channel?.owner?._id || channel?.owner;
            const isOwner = channelOwnerId && user?.id === String(channelOwnerId);
            const isDM = channel.isPrivate;
            const channelName = isDM
              ? channel.members.find((m) => m._id !== user.id)?.displayName || "Direct Message"
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
                  className={`flex-1 text-left p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{isDM ? channelName : `#${channelName}`}</div>
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
    [channels, selectedChannelId, onSelectChannel, onDeleteChannel, user, hoveredChannelId]
  );

  return (
    <div className="h-full flex flex-col bg-secondary text-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 z-10 bg-secondary">
        <h2 className="text-lg font-semibold">Channels</h2>
        <div className="flex items-center space-x-2">
          {/* Add Channel / DM dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(!showAddMenu);
              }}
              className="p-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              +
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border text-foreground rounded-md shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleCreateChannel}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    userHasChannel ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                  }`}
                  disabled={userHasChannel}
                >
                  Create Channel
                </button>
                <button
                  onClick={handleCreateDM}
                  className="block px-4 py-2 text-sm w-full text-left hover:bg-muted"
                >
                  Start Direct Message
                </button>
              </div>
            )}
          </div>

          {/* Main Menu dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-muted text-foreground rounded-full hover:bg-muted-foreground/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border text-foreground rounded-md shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    if (onRefetch) onRefetch();
                    setShowMenu(false);
                  }}
                  className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                >
                  Refresh Channels
                </button>
                <button
                  onClick={toggleTheme}
                  className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                >
                  Switch to {theme === "light" ? "Dark" : "Light"} Mode
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to logout?")) {
                      onLogout();
                      setShowMenu(false);
                    }
                  }}
                  className="block px-4 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-destructive-foreground bg-destructive/10 rounded-md text-sm">
            {typeof error === "string" ? error : "An unexpected error occurred"}
          </div>
        ) : !Array.isArray(channels) ? (
          <div className="p-4 text-destructive-foreground bg-destructive/10 rounded-md text-sm">
            Error: Invalid channel data
          </div>
        ) : channels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No channels yet. Click the + button to create the first channel.
          </div>
        ) : (
          <div className="space-y-1">{channelButtons}</div>
        )}
      </div>
    </div>
  );
}
