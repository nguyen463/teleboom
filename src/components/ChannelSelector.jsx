"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../utils/auth";
import { useTheme } from "./ThemeContext";

export default function ChannelSelector({
  user,
  channels = [],
  loading,
  selectedChannelId,
  onSelectChannel,
  onRefetch,
  onCreateChannel,
  onLogout,
  onDeleteChannel, // Tambahkan prop ini
  error,
}) {
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

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

  const channelButtons = useMemo(
    () =>
      (channels || []).map((channel) => {
        const channelId = channel._id || channel.id;
        const isSelected = channelId === selectedChannelId;
        
        // Ambil ID pemilik channel dari data yang diterima
        const channelOwnerId = channel.ownerId?._id || channel.ownerId;
        
        // Periksa apakah user saat ini adalah pemilik channel
        const isOwner = user?.id === channelOwnerId;

        return (
          <div key={channelId} className="relative flex items-center group">
            <button
              onClick={() => onSelectChannel(channelId)}
              className={`flex-1 text-left p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              aria-selected={isSelected}
              aria-label={`Select channel ${channel.name}${channel.description ? ` - ${channel.description}` : ""}`}
            >
              <div className="font-medium">#{channel.name}</div>
              {channel.description && (
                <div className="text-xs opacity-75 truncate">{channel.description}</div>
              )}
            </button>
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Stop event bubbling to parent button
                  onDeleteChannel(channelId);
                }}
                className={`absolute right-2 p-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity`}
                aria-label={`Delete channel ${channel.name}`}
                title={`Delete channel ${channel.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.013 21H7.987a2 2 0 01-1.92-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        );
      }),
    [channels, selectedChannelId, onSelectChannel, onDeleteChannel, user]
  );

  return (
    <div className="h-full flex flex-col bg-secondary text-foreground">
      <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-semibold">Channels</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCreateChannel}
            className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Buat Channel Baru"
            title="Buat Channel Baru"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-muted text-foreground rounded-full hover:bg-muted-foreground/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Menu"
              aria-expanded={showMenu}
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
              <div
                className="absolute right-0 mt-2 w-48 bg-card border border-border text-foreground rounded-md shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200"
                role="menu"
                aria-labelledby="menu-button"
              >
                <button
                  onClick={() => {
                    onRefetch();
                    setShowMenu(false);
                  }}
                  className="block px-4 py-2 text-sm hover:bg-muted w-full text-left focus:outline-none focus:bg-muted"
                  role="menuitem"
                >
                  Refresh Channels
                </button>
                <button
                  onClick={toggleTheme}
                  className="block w-full text-left px-4 py-2 hover:bg-muted transition-colors"
                >
                  Switch to {theme === "light" ? "Dark" : "Light"} Mode
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setShowMenu(false);
                  }}
                  className="block px-4 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left focus:outline-none focus:bg-destructive/10"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Channel list">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-destructive-foreground bg-destructive/10 rounded-md text-sm" role="alert">
            {error}
          </div>
        ) : (channels?.length ?? 0) === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Tidak ada channels. Klik tombol + untuk membuat channel baru.
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
