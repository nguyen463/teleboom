"use client";

import { useState, useMemo, useRef, useEffect } from "react";

export default function ChannelSelector({ 
  user, 
  channels, 
  loading, 
  selectedChannelId, 
  onSelectChannel, 
  onRefetch, 
  onCreateChannel, 
  onLogout, 
  error 
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
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

  // Close menu on Escape key
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

  // Memoize channel buttons for performance (aligns with page's useCallback patterns)
  const channelButtons = useMemo(() => 
    channels.map((channel) => {
      const channelId = channel._id || channel.id;
      const isSelected = channelId === selectedChannelId;
      return (
        <button
          key={channelId}
          onClick={() => onSelectChannel(channelId)}
          className={`w-full text-left p-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
          }`}
          aria-selected={isSelected}
          aria-label={`Select channel ${channel.name}${channel.description ? ` - ${channel.description}` : ''}`}
        >
          <div className="font-medium">#{channel.name}</div>
          {channel.description && (
            <div className="text-xs opacity-75 truncate">{channel.description}</div>
          )}
        </button>
      );
    }), 
    [channels, selectedChannelId, onSelectChannel]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header dengan tombol buat channel dan logout - sticky for alignment with page */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
        <h2 className="text-lg font-semibold">Channels</h2>
        <div className="flex items-center space-x-2">
          {/* Tombol Buat Channel */}
          <button
            onClick={onCreateChannel}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Buat Channel Baru"
            title="Buat Channel Baru"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Tombol Menu (untuk logout dan refresh) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Menu"
              aria-expanded={showMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {showMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200"
                role="menu"
                aria-labelledby="menu-button"
              >
                <button
                  onClick={() => {
                    onRefetch();
                    setShowMenu(false); // Close menu after action, aligning with page UX
                  }}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left focus:outline-none focus:bg-gray-100"
                  role="menuitem"
                >
                  Refresh Channels
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setShowMenu(false);
                  }}
                  className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left focus:outline-none focus:bg-gray-100"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Channels - with ARIA for alignment with page's role="main" */}
      <div className="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Channel list">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 bg-red-50 rounded-md text-sm" role="alert">
            {error}
          </div>
        ) : channels.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
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
