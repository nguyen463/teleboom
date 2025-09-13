"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/utils/auth";
import { useTheme } from "./ThemeContext";

export default function ChannelSelector({
  user,
  channels = [],
  loading = false,
  selectedChannelId,
  onSelectChannel,
  onRefetch,
  onCreateChannel,
  onLogout,
  onDeleteChannel,
  error,
}) {
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showMenu]);

  const channelButtons = useMemo(() => {
    return (channels || []).map((channel) => {
      const channelId = channel?._id || channel?.id;
      const channelOwnerId =
        typeof channel?.ownerId === "object"
          ? channel?.ownerId?._id
          : channel?.ownerId;
      const isOwner = user?.id === channelOwnerId;

      // Debug log
      console.log("Channel:", channel?.name, "ownerId:", channelOwnerId, "user.id:", user?.id, "isOwner:", isOwner);

      return (
        <div
          key={channelId}
          className="relative flex items-center group border border-transparent hover:border-red-500 p-1 rounded"
        >
          <button
            onClick={() => onSelectChannel(channelId)}
            className={`flex-1 text-left p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              selectedChannelId === channelId
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-selected={selectedChannelId === channelId}
          >
            <div className="font-medium">#{channel?.name}</div>
            {channel?.description && (
              <div className="text-xs opacity-75 truncate">
                {channel.description}
              </div>
            )}
          </button>

          {/* Tombol hapus debug */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChannel(channelId);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 z-50"
            title={`Delete channel ${channel?.name}`}
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
        </div>
      );
    });
  }, [channels, selectedChannelId, onSelectChannel, onDeleteChannel, user]);

  return (
    <div className="h-full flex flex-col bg-secondary text-foreground">
      <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-semibold">Channels (Debug)</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCreateChannel}
            className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            + New
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-muted text-foreground rounded-full hover:bg-muted-foreground/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              ☰
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border text-foreground rounded-md shadow-lg py-1 z-20">
                <button onClick={onRefetch} className="block px-4 py-2 text-sm w-full text-left hover:bg-muted">
                  Refresh
                </button>
                <button onClick={toggleTheme} className="block px-4 py-2 text-sm w-full text-left hover:bg-muted">
                  Switch Theme
                </button>
                <button
                  onClick={onLogout}
                  className="block px-4 py-2 text-sm w-full text-left hover:bg-destructive/10 text-destructive"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-destructive-foreground bg-destructive/10 rounded-md text-sm" role="alert">
            {error}
          </div>
        ) : channels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Tidak ada channels
          </div>
        ) : (
          <div className="space-y-1">{channelButtons}</div>
        )}
      </div>
    </div>
  );
}
