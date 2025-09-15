// src/app/channels/page.jsx
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

function LoadingState({ message }) { /* ... */ }
function ErrorState({ message, onRetry }) { /* ... */ }
function EmptyState({ onShowAddChannelModal }) { /* ... */ }
function WelcomeState() { /* ... */ }

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

  const handleCreatePublicChannel = useCallback(async (name) => {
    setIsCreating(true);
    try {
      const res = await api.post("/api/channels", { name });
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

  const handleStartDm = useCallback((otherUserId) => {
    if (api?.socket) {
      api.socket.emit("startDm", otherUserId, (response) => {
        if (response?.success && response.channelId) {
          toast.success("DM started successfully!");
          setView('channels');
          fetchChannels();
          handleSelectChannel(response.channelId);
        } else {
          toast.error(response?.error || "Failed to start DM.");
        }
      });
    }
  }, [api, fetchChannels, handleSelectChannel]);

  const handleDeleteChannel = useCallback(async (channelId) => { /* ... */ }, [api, channels, selectedChannelId, handleSelectChannel]);

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
        return <AddChannelModal onShowPublicChannelForm={() => setView('public-form')} onShowUserList={() => setView('user-list')} onClose={() => setView('channels')} />;
      case 'public-form':
        return <PublicChannelForm onCreate={handleCreatePublicChannel} onClose={() => setView('channels')} isLoading={isCreating} />;
      case 'user-list':
        return <UserList user={user} onStartDm={handleStartDm} onClose={() => setView('channels')} api={api} />;
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
