// ChannelsPage.jsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "../../components/ChannelSelector";
import ChatLayout from "../../components/ChatLayout";
// ✅ Impor komponen modal
import AddChannelModal from "../../components/AddChannelModal";
import PublicChannelForm from "../../components/PublicChannelForm";
import UserList from "../../components/UserList";
import { useAuth } from "../utils/auth";
import { useTheme } from "../../components/ThemeContext";
import { toast } from "react-toastify";

// Helper components for different states (no changes needed)
function LoadingState({ message }) {
  // ... (kode tetap sama)
}

function ErrorState({ message, onRetry }) {
  // ... (kode tetap sama)
}

function EmptyState({ onShowAddChannelModal }) {
  // ... (kode tetap sama)
}

function WelcomeState() {
  // ... (kode tetap sama)
}

// MAIN COMPONENT
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
  const [view, setView] = useState('channels');
  const [isCreating, setIsCreating] = useState(false);

  const fetchChannels = useCallback(async () => {
    // ... (kode tetap sama)
  }, [user, api, router, urlChannelId, logout, pathname, searchParams, channelsLoading]);

  const handleSetUrlChannelId = useCallback(
    (channelId) => {
      // ... (kode tetap sama)
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
    // ... (kode tetap sama)
  }, [api, handleSelectChannel, fetchChannels]);

  const handleStartDm = useCallback((otherUserId) => {
    if (api?.socket) {
      api.socket.emit("startDm", otherUserId, (response) => {
        if (response?.success && response.channelId) {
          toast.success("DM started successfully!");
          handleSelectChannel(response.channelId);
          setView('channels');
          fetchChannels();
        } else {
          toast.error(response?.error || "Failed to start DM.");
        }
      });
    }
  }, [api, handleSelectChannel, fetchChannels]);

  const handleDeleteChannel = useCallback(async (channelId) => {
    // ... (kode tetap sama)
  }, [api, channels, selectedChannelId, handleSelectChannel]);

  useEffect(() => {
    // ... (kode tetap sama)
  }, [user, channels.length, channelsLoading, fetchChannels]);
  
  useEffect(() => {
    // ... (kode tetap sama)
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
    // ... (kode tetap sama)
  };

  // ✅ Perbaikan: Pisahkan logika render modal ke fungsi terpisah
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
      {/* Sidebar is always rendered */}
      <div className="w-1/4 min-w-64 bg-secondary border-r border-border">
        <ChannelSelector
          user={user}
          channels={channels || []}
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
      
      {/* Main chat content area */}
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
      
      {/* ✅ Perbaikan: Render modals di luar layout utama */}
      {renderModals()}
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
