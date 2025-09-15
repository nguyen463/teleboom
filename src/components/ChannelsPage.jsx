// ChannelsPage.jsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "../../components/ChannelSelector";
import ChatLayout from "../../components/ChatLayout";
import { useAuth } from "../utils/auth";
import { useTheme } from "../../components/ThemeContext";

// Komponen untuk modal pilihan aksi
function AddChannelModal({ onShowPublicChannelForm, onShowUserList, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-sm text-foreground space-y-4">
        <h2 className="text-xl font-bold text-center">Create or Start</h2>
        <p className="text-center text-sm text-muted-foreground">Choose an action to create a new channel or start a direct message.</p>
        <div className="flex flex-col space-y-2">
          <button
            onClick={onShowPublicChannelForm}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Public Channel
          </button>
          <button
            onClick={onShowUserList}
            className="w-full py-2 bg-secondary text-foreground rounded-md hover:bg-muted transition-colors"
          >
            Start a New DM
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-transparent text-muted-foreground rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Komponen untuk form pembuatan channel publik
function PublicChannelForm({ onCreate, onClose, isLoading }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-foreground">
        <h2 className="text-xl font-bold mb-4">Create Public Channel</h2>
        <form onSubmit={(e) => { e.preventDefault(); onCreate(name); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., general-chat"
              required
              maxLength={50}
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/70 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Komponen untuk daftar pengguna DM
function UserList({ user, onStartDm, onClose, api }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/users");
        const usersData = response.data.users || response.data;
        setUsers(usersData);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [api]);

  return (
    <div className="w-1/4 min-w-64 bg-secondary border-r border-border flex flex-col h-screen">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-xl font-bold">Start a new DM</h2>
        <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ul className="space-y-2 overflow-y-auto p-4 flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          users.filter(u => u._id !== user.id).map(otherUser => (
            <li key={otherUser._id}>
              <button
                onClick={() => onStartDm(otherUser._id)}
                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
              >
                {otherUser.displayName}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ChannelsPageContent() {
  const { user, loading: authLoading, api, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlChannelId = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreatePublicChannel = useCallback(async (name) => {
    setIsCreating(true);
    try {
      const res = await api.post("/api/channels", { name, isPrivate: false });
      const channelId = res.data.channel?._id || res.data._id;
      if (!channelId) throw new Error("No channel ID in response");
      toast.success("Public channel created successfully!");
      setShowAddChannelModal(false);
      handleSelectChannel(channelId);
    } catch (err) {
      console.error("Error creating public channel:", err);
      toast.error(err.response?.data?.message || "Failed to create public channel.");
    } finally {
      setIsCreating(false);
    }
  }, [api, handleSelectChannel]);

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
        return <EmptyState onStartDm={() => setShowUserList(true)} />;
    }
    return <WelcomeState />;
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Render AddChannelModal jika state aktif */}
      {showAddChannelModal && (
        <AddChannelModal 
          onShowPublicChannelForm={() => setShowAddChannelModal(false) || setShowUserList(false) || router.push('/channels/new')} // Redirect ke halaman baru untuk sementara
          onShowUserList={() => {
            setShowAddChannelModal(false);
            setShowUserList(true);
          }}
          onClose={() => setShowAddChannelModal(false)}
        />
      )}
      
      {/* Render UserList jika state aktif */}
      {showUserList && (
        <UserList
          user={user}
          onStartDm={handleStartDm}
          onClose={() => setShowUserList(false)}
          api={api}
        />
      )}

      {/* Render ChannelSelector jika tidak ada modal yang tampil */}
      {!showUserList && (
        <div className="w-1/4 min-w-64 bg-secondary border-r border-border">
          <ChannelSelector
            user={user}
            channels={channels || []}
            loading={channelsLoading}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleSelectChannel}
            onRefetch={fetchChannels}
            onStartDm={() => setShowUserList(true)} // ✅ Panggil handleStartDm untuk membuka daftar user
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

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
      <p className="text-foreground">Checking authentication...</p>
    </div>
  );
}

function LoadingState({ message }) {
    return (
        <div className="text-center p-6 max-w-md">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground">{message}</p>
        </div>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <div className="text-center p-6 max-w-md">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p className="text-destructive-foreground mb-2">{message}</p>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
                Try again
            </button>
        </div>
    );
}

function EmptyState({ onStartDm }) {
    return (
        <div className="text-center p-6 max-w-md">
            <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <p className="text-foreground mb-2">No channels yet. Start a new DM or create a public channel.</p>
            <button
                onClick={onStartDm}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors mt-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
                Start a New DM
            </button>
        </div>
    );
}

function WelcomeState() {
  return (
    <div className="text-center p-6 max-w-md">
      <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
          />
        </svg>
      </div>
      <p className="text-foreground">Select a channel to start a chat</p>
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        </div>
      }
    >
      <ChannelsPageContent />
    </Suspense>
  );
}
