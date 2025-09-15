// ChannelsPage.jsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "../../components/ChannelSelector";
import ChatLayout from "../../components/ChatLayout";
import { useAuth } from "../utils/auth";
import { useTheme } from "../../components/ThemeContext";

// Component untuk menampilkan daftar pengguna lain (konsep)
function UserList({ user, onStartDm, onClose }) {
  // TODO: Implementasi nyata harus fetch daftar user dari API
  const allUsers = [
    { id: 'user_id_2', displayName: 'Jane Doe' },
    { id: 'user_id_3', displayName: 'Peter Pan' },
    //... tambahkan user lain di sini
  ];

  return (
    <div className="flex flex-col h-full bg-secondary p-4">
      <h2 className="text-xl font-bold mb-4">Start a new DM</h2>
      <ul className="space-y-2 overflow-y-auto flex-1">
        {allUsers.filter(u => u.id !== user.id).map(otherUser => (
          <li key={otherUser.id}>
            <button onClick={() => onStartDm(otherUser.id)} className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors">
              {otherUser.displayName}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onClose} className="mt-4 w-full px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/70 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function ChannelsPageContent() {
  const { user, loading: authLoading, api, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlChannelId = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUserList, setShowUserList] = useState(false);

  const fetchChannels = useCallback(async () => {
    if (!user?.token || channelsLoading) return;

    setChannelsLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/channels");
      const channelsData = response.data || [];

      if (!Array.isArray(channelsData)) {
        console.warn("Unexpected API response format:", response.data);
        throw new Error("Invalid channel data format.");
      }

      setChannels(channelsData || []);
      
      const currentChannelExists = channelsData.find(ch => (ch._id || ch.id) === urlChannelId);

      if (urlChannelId && currentChannelExists) {
        setSelectedChannelId(urlChannelId);
      } else if (channelsData.length > 0) {
        const firstChannelId = channelsData[0]._id || channelsData[0].id;
        setSelectedChannelId(firstChannelId);
        handleSetUrlChannelId(firstChannelId);
      } else {
        setSelectedChannelId(null);
        handleSetUrlChannelId(null);
      }

    } catch (err) {
      console.error("Error fetching channels:", err);
      setError("Failed to load channels. Please try again.");
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setChannelsLoading(false);
    }
  }, [user, api, router, urlChannelId, logout, pathname, searchParams, channelsLoading]);

  const handleSetUrlChannelId = useCallback(
    (channelId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (channelId) {
        params.set("id", channelId);
      } else {
        params.delete("id");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );
  
  const handleSelectChannel = useCallback(
    (channelId) => {
      setSelectedChannelId(channelId);
      handleSetUrlChannelId(channelId);
    },
    [handleSetUrlChannelId]
  );

  const handleCreateChannel = useCallback(() => {
    // Alih-alih mengarahkan ke halaman terpisah, tampilkan daftar pengguna
    setShowUserList(true);
  }, []);

  // ✅ New function to handle starting a DM
  const handleStartDm = useCallback((otherUserId) => {
    if (api?.socket) {
      api.socket.emit("startDm", otherUserId, (response) => {
        if (response?.success && response.channelId) {
          toast.success("DM started successfully!");
          handleSelectChannel(response.channelId);
          setShowUserList(false);
        } else {
          toast.error(response?.error || "Failed to start DM.");
        }
      });
    }
  }, [api, handleSelectChannel]);

  const handleDeleteChannel = useCallback(async (channelId) => {
    if (window.confirm("Are you sure you want to delete this channel?")) {
      try {
        await api.delete(`/api/channels/${channelId}`);
        const newChannels = channels.filter(ch => (ch._id || ch.id) !== channelId);
        setChannels(newChannels);
        
        if (selectedChannelId === channelId) {
          const newSelectedId = newChannels.length > 0 ? (newChannels[0]._id || newChannels[0].id) : null;
          handleSelectChannel(newSelectedId);
        }
      } catch (err) {
        console.error("Failed to delete channel:", err);
        setError("Failed to delete channel. Only the channel owner can delete it.");
      }
    }
  }, [api, channels, selectedChannelId, handleSelectChannel]);

  useEffect(() => {
    if (user && !channels.length && !channelsLoading) {
      fetchChannels();
    }
  }, [user, channels.length, channelsLoading, fetchChannels]);
  
  useEffect(() => {
    if (!user || !api?.socket) return;
    const socket = api.socket;
    
    socket.off("channelCreated");
    socket.off("channelDeleted");
    
    socket.on("channelCreated", (newChannel) => {
      setChannels(prev => [...prev, newChannel]);
    });
    socket.on("channelDeleted", (deletedChannelId) => {
      setChannels(prev => prev.filter(ch => (ch._id || ch.id) !== deletedChannelId));
      if (selectedChannelId === deletedChannelId) {
        const newSelectedId = channels.length > 0 ? (channels[0]?._id || channels[0]?.id) : null;
        handleSelectChannel(newSelectedId);
      }
    });

    return () => {
      socket.off("channelCreated");
      socket.off("channelDeleted");
    };
  }, [user, api, selectedChannelId, handleSelectChannel, channels.length]);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <p className="text-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const renderChatContent = () => {
    if (channelsLoading) {
        return <LoadingState message="Loading channels..." />;
    }
    if (error) {
        return <ErrorState message={error} onRetry={fetchChannels} />;
    }
    if (selectedChannelId && selectedChannelId !== "undefined") {
        return <ChatLayout
            user={user}
            channelId={selectedChannelId}
            logout={logout}
            key={selectedChannelId}
        />;
    }
    if (channels.length === 0) {
        return <EmptyState onCreateChannel={handleCreateChannel} />;
    }
    return <WelcomeState />;
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Jika ingin memulai DM, tampilkan daftar user */}
      {showUserList && <UserList user={user} onStartDm={handleStartDm} onClose={() => setShowUserList(false)} />}
      
      {/* Tampilkan channel selector hanya jika tidak sedang dalam mode DM */}
      {!showUserList && (
        <div className="w-1/4 min-w-64 bg-secondary border-r border-border">
          <ChannelSelector
            user={user}
            channels={channels || []}
            loading={channelsLoading}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleSelectChannel}
            onRefetch={fetchChannels}
            onCreateChannel={handleCreateChannel}
            onLogout={logout}
            error={error}
            onDeleteChannel={handleDeleteChannel}
          />
        </div>
      )}
      <div
        className="flex-1 flex flex-col bg-background"
        role="main"
        aria-label="Chat area"
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-background">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <div className="flex items-center justify-center h-full min-h-full bg-background">
            {renderChatContent()}
          </div>
        </Suspense>
      </div>
    </div>
  );
}

// ... (LoadingScreen, LoadingState, ErrorState, EmptyState, WelcomeState components) ...
