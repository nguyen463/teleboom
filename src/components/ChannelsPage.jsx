"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "../../components/ChannelSelector";
import ChatLayout from "../../components/ChatLayout";
import AddChannelModal from "../../components/AddChannelModal";
import PublicChannelForm from "../../components/PublicChannelForm";
import UserList from "../../components/UserList";
import { useAuth } from "../utils/auth";
import { toast } from "react-toastify";

function LoadingState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
      <div className="text-destructive mb-4">Error: {message}</div>
      <button
        onClick={onRetry}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

function EmptyState({ onShowAddChannelModal }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 mb-4 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      <p className="text-lg mb-4">No channels yet</p>
      <button
        onClick={onShowAddChannelModal}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Create Your First Channel
      </button>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4">Welcome to TeleBoom!</h1>
      <p className="text-muted-foreground mb-6 text-center">
        Select a channel from the sidebar or create a new one to start chatting.
      </p>
      <div className="flex space-x-4">
        <div className="flex flex-col items-center p-4 bg-secondary rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 mb-2 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-sm">Public Channels</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-secondary rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 mb-2 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm">Direct Messages</span>
        </div>
      </div>
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
  const [view, setView] = useState('channels'); // 'channels', 'add-modal', 'public-form', 'user-list'
  const [isCreating, setIsCreating] = useState(false);

  const fetchChannels = useCallback(async () => {
    if (!user?.token || channelsLoading) return;
    setChannelsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/channels");
      const channelsData = response.data || [];
      if (!Array.isArray(channelsData)) {
        throw new Error("Invalid channel data format.");
      }
      setChannels(channelsData);
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
      if (err.response?.status === 401) logout();
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
  
  const handleSelectChannel = useCallback((channelId) => {
    setSelectedChannelId(channelId);
    handleSetUrlChannelId(channelId);
  }, [handleSetUrlChannelId]);

  const handleCreatePublicChannel = useCallback(async (channelData) => {
    setIsCreating(true);
    try {
      const res = await api.post("/api/channels", channelData);
      const channel = res.data.channel;
      if (!channel) throw new Error("No channel data in response");
      toast.success("Public channel created successfully!");
      setView('channels');
      fetchChannels();
      handleSelectChannel(channel._id);
    } catch (err) {
      console.error("Error creating public channel:", err);
      toast.error(err.response?.data?.message || "Failed to create public channel.");
    } finally {
      setIsCreating(false);
    }
  }, [api, fetchChannels, handleSelectChannel]);

  const handleStartDm = useCallback(async (otherUserId) => {
    setIsCreating(true);
    try {
      const response = await api.post("/api/channels/dm", { userId: otherUserId });
      if (response.data?.channel) {
        toast.success("DM started successfully!");
        setView('channels');
        fetchChannels();
        handleSelectChannel(response.data.channel._id);
      } else {
        throw new Error("No channel data in response");
      }
    } catch (err) {
      console.error("Error starting DM:", err);
      toast.error(err.response?.data?.message || "Failed to start DM.");
    } finally {
      setIsCreating(false);
    }
  }, [api, fetchChannels, handleSelectChannel]);

  const handleDeleteChannel = useCallback(async (channelId) => {
    if (!window.confirm("Are you sure you want to delete this channel?")) return;
    
    try {
      await api.delete(`/api/channels/${channelId}`);
      toast.success("Channel deleted successfully!");
      
      // If the deleted channel was the selected one, clear selection
      if (selectedChannelId === channelId) {
        setSelectedChannelId(null);
        handleSetUrlChannelId(null);
      }
      
      // Refresh channels list
      fetchChannels();
    } catch (err) {
      console.error("Error deleting channel:", err);
      toast.error(err.response?.data?.message || "Failed to delete channel.");
    }
  }, [api, selectedChannelId, handleSetUrlChannelId, fetchChannels]);

  useEffect(() => {
    if (user && !channels.length && !channelsLoading) {
      fetchChannels();
    }
  }, [user, channels.length, channelsLoading, fetchChannels]);
  
  useEffect(() => {
    if (!user || !api?.socket) return;
    const socket = api.socket;
    
    socket.on("channelCreated", fetchChannels);
    socket.on("channelDeleted", fetchChannels);

    return () => {
      socket.off("channelCreated");
      socket.off("channelDeleted");
    };
  }, [user, api, fetchChannels]);

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
    if (channelsLoading) return <LoadingState message="Loading channels..." />;
    if (error) return <ErrorState message={error} onRetry={fetchChannels} />;
    if (selectedChannelId) {
      return <ChatLayout user={user} channelId={selectedChannelId} logout={logout} key={selectedChannelId} />;
    }
    if (channels.length === 0) {
      return <EmptyState onShowAddChannelModal={() => setView('add-modal')} />;
    }
    return <WelcomeState />;
  };

  const renderModals = () => {
    switch (view) {
      case 'add-modal':
        return (
          <AddChannelModal 
            onShowPublicChannelForm={() => setView('public-form')} 
            onShowUserList={() => setView('user-list')} 
            onClose={() => setView('channels')} 
          />
        );
      case 'public-form':
        return (
          <PublicChannelForm 
            onCreate={handleCreatePublicChannel} 
            onClose={() => setView('channels')} 
            isLoading={isCreating} 
          />
        );
      case 'user-list':
        return (
          <UserList 
            user={user} 
            onStartDm={handleStartDm} 
            onClose={() => setView('channels')} 
            api={api} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-1/4 min-w-64 bg-secondary border-r border-border">
        <ChannelSelector
          user={user}
          channels={channels}
          loading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onRefetch={fetchChannels}
          onShowAddChannelModal={() => setView('add-modal')}
          onLogout={logout}
          error={error}
          onDeleteChannel={handleDeleteChannel}
          onCreateChannel={handleCreatePublicChannel}
          onCreateDM={handleStartDm}
        />
      </div>
      <div className="flex-1 flex flex-col bg-background" role="main" aria-label="Chat area">
        <Suspense fallback={<div className="flex items-center justify-center h-full bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <div className="flex items-center justify-center h-full min-h-full bg-background">
            {renderChatContent()}
          </div>
        </Suspense>
      </div>
      {renderModals()}
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    }>
      <ChannelsPageContent />
    </Suspense>
  );
}
