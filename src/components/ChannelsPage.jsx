"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "@/components/ChannelSelector";
import ChatLayout from "@/components/ChatLayout";
import { useAuth } from "../utils/auth";

export default function ChannelsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ChannelsPageContent />
    </Suspense>
  );
}

function ChannelsPageContent() {
  const { user, loading: authLoading, logout, api } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlChannelId = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refetch channels dari API
  const fetchChannels = useCallback(async () => {
    if (!user?.token || !api?.get) {
      setError("Autentikasi tidak valid. Silakan login kembali.");
      router.push("/login");
      return;
    }

    setChannelsLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/channels");
      const channelsData = response.data || [];

      if (!Array.isArray(channelsData)) {
        console.warn("Unexpected API response format:", response.data);
        throw new Error("Format data channel tidak valid.");
      }

      setChannels(channelsData);
      
      const currentChannelExists = channelsData.find(ch => (ch._id || ch.id) === urlChannelId);

      if (urlChannelId && currentChannelExists) {
        setSelectedChannelId(urlChannelId);
      } else if (channelsData.length > 0) {
        // Pilih channel pertama jika tidak ada ID di URL atau ID tidak valid
        const firstChannelId = channelsData[0]._id || channelsData[0].id;
        setSelectedChannelId(firstChannelId);
        handleSetUrlChannelId(firstChannelId);
      } else {
        setSelectedChannelId(null);
        handleSetUrlChannelId(null);
      }

    } catch (err) {
      console.error("Error fetching channels:", err);
      setError("Gagal memuat channels. Silakan coba lagi.");
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setChannelsLoading(false);
    }
  }, [user, api, router, urlChannelId, logout]);

  // Handle set URL
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
    router.push("/channels/new");
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleDeleteChannel = useCallback(async (channelId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus channel ini?")) {
      try {
        await api.delete(`/api/channels/${channelId}`);
        const newChannels = channels.filter(ch => (ch._id || ch.id) !== channelId);
        setChannels(newChannels);
        
        if (selectedChannelId === channelId) {
          const newSelectedId = newChannels.length > 0 ? (newChannels[0]._id || newChannels[0].id) : null;
          handleSelectChannel(newSelectedId);
        }
      } catch (err) {
        console.error("Gagal menghapus channel:", err);
        setError("Gagal menghapus channel. Hanya pemilik channel yang bisa menghapusnya.");
      }
    }
  }, [api, channels, selectedChannelId, handleSelectChannel]);

  // Fetch channels saat user terautentikasi dan pertama kali dimuat
  useEffect(() => {
    if (user && !channels.length && !channelsLoading) {
      fetchChannels();
    }
  }, [user, channels.length, channelsLoading, fetchChannels]);
  
  // Sinkronisasi URL dengan state lokal
  useEffect(() => {
      if (urlChannelId && selectedChannelId !== urlChannelId) {
          const channelExists = channels.some(ch => (ch._id || ch.id) === urlChannelId);
          if (channelExists) {
              setSelectedChannelId(urlChannelId);
          } else if (!channelsLoading) {
              // Jika ID di URL tidak valid, redirect ke channel pertama
              const firstChannelId = channels.length > 0 ? (channels[0]._id || channels[0].id) : null;
              handleSetUrlChannelId(firstChannelId);
          }
      }
  }, [urlChannelId, selectedChannelId, channels, channelsLoading, handleSetUrlChannelId]);

  // Socket real-time listener
  useEffect(() => {
    if (!user || !api?.socket) return;

    const socket = api.socket;
    
    // Pastikan listener tidak menumpuk
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
        <p className="text-foreground">Memeriksa autentikasi...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-64 md:w-80 lg:w-96 bg-secondary border-r border-border">
        <ChannelSelector
          user={user}
          channels={channels}
          loading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onRefetch={fetchChannels}
          onCreateChannel={handleCreateChannel}
          onLogout={handleLogout}
          error={error}
          onDeleteChannel={handleDeleteChannel}
        />
      </div>
      <div className="flex-1 flex flex-col bg-background" role="main" aria-label="Chat area">
        <div className="flex items-center justify-center h-full bg-background">
          {channelsLoading ? (
            <LoadingState message="Memuat channels..." />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchChannels} />
          ) : selectedChannelId ? (
            <ChatLayout
              user={user}
              channelId={selectedChannelId}
              logout={handleLogout}
              key={selectedChannelId}
            />
          ) : (
            <EmptyState onCreateChannel={handleCreateChannel} />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
      <p className="text-foreground">Memuat aplikasi...</p>
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
                Coba Lagi
            </button>
        </div>
    );
}

function EmptyState({ onCreateChannel }) {
    return (
        <div className="text-center p-6 max-w-md">
            <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <p className="text-foreground mb-2">Belum ada channel</p>
            <button
                onClick={onCreateChannel}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors mt-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
                Buat Channel Pertama
            </button>
        </div>
    );
}
