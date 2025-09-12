"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "@/components/ChannelSelector";
import ChatLayout from "@/components/ChatLayout";
import { useAuth } from "../../utils/auth";
import { useTheme } from "../../components/ThemeContext";

// Komponen utama yang menampung semua logika klien
function ChatContainer() {
  const { user, loading, logout, api } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlChannelId = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState(null);
  const manualSelectionRef = useRef(false);

  // Fungsi untuk mengambil data channel dari API
  const fetchChannels = useCallback(async () => {
    if (!user?.token) return;
    setChannelsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/channels");
      const data = response.data || { channels: [] };
      let channelsData = [];
      if (Array.isArray(data)) {
        channelsData = data;
      } else if (Array.isArray(data.channels)) {
        channelsData = data.channels;
      } else if (Array.isArray(data.data)) {
        channelsData = data.data;
      } else if (data.channel) {
        channelsData = [data.channel];
      }
      setChannels(channelsData);
      if (!manualSelectionRef.current && channelsData.length > 0) {
        const channelExists = channelsData.find(ch => ch._id === urlChannelId || ch.id === urlChannelId);
        if (channelExists && urlChannelId && urlChannelId !== "undefined") {
          setSelectedChannelId(urlChannelId);
        } else if (!selectedChannelId) {
          setSelectedChannelId(channelsData[0]._id || channelsData[0].id);
        }
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
  }, [user, api, urlChannelId, selectedChannelId, logout]);

  // Panggil fetchChannels saat user data tersedia
  useEffect(() => {
    if (user && !channels.length && !channelsLoading) {
      fetchChannels();
    }
  }, [user, channels.length, channelsLoading, fetchChannels]);

  // Sinkronkan selectedChannelId dengan query param saat berubah
  useEffect(() => {
    if (urlChannelId && urlChannelId !== "undefined" && urlChannelId !== selectedChannelId && !manualSelectionRef.current) {
      handleSelectChannel(urlChannelId);
    }
  }, [urlChannelId, selectedChannelId]);

  const handleSelectChannel = useCallback(
    (channelId) => {
      if (!channelId || channelId === "undefined") return;
      manualSelectionRef.current = true;
      setSelectedChannelId(channelId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", channelId);
      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const refetchChannels = useCallback(() => {
    manualSelectionRef.current = false;
    fetchChannels();
  }, [fetchChannels]);

  const handleCreateChannel = useCallback(() => {
    router.push("/channels/new");
  }, [router]);

  const handleDeleteChannel = useCallback(async (channelId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus channel ini?")) {
      try {
        await api.delete(`/api/channels/${channelId}`);
        setChannels(prev => prev.filter(ch => (ch._id || ch.id) !== channelId));
        if (selectedChannelId === channelId) {
          const newChannels = channels.filter(ch => (ch._id || ch.id) !== channelId);
          const newSelectedId = newChannels[0]?._id || newChannels[0]?.id || null;
          handleSelectChannel(newSelectedId);
        }
      } catch (err) {
        console.error("Gagal menghapus channel:", err);
        alert("Gagal menghapus channel. Hanya pemilik channel yang bisa menghapusnya.");
      }
    }
  }, [api, channels, selectedChannelId, handleSelectChannel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Memverifikasi token...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-1/4 min-w-64 bg-secondary border-r border-border">
        <ChannelSelector
          user={user}
          channels={channels}
          loading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onRefetch={refetchChannels}
          onCreateChannel={handleCreateChannel}
          onLogout={logout}
          error={error}
          onDeleteChannel={handleDeleteChannel}
        />
      </div>
      
      <div className="flex-1 flex flex-col" role="main">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          {selectedChannelId ? (
            <ChatLayout
              user={user}
              channelId={selectedChannelId}
              logout={logout}
              key={selectedChannelId}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-center p-6 max-w-md text-foreground">
                {channelsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-foreground">Memuat channels...</p>
                  </>
                ) : error ? (
                  <>
                    <div className="mx-auto mb-4 w-16 h-16 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground">
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
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-destructive-foreground mb-2">{error}</p>
                    <button
                      onClick={refetchChannels}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      Coba Lagi
                    </button>
                  </>
                ) : channels.length === 0 ? (
                  <>
                    <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <p className="text-foreground mb-2">Belum ada channel</p>
                    <button
                      onClick={handleCreateChannel}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors mt-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      Buat Channel Pertama
                    </button>
                  </>
                ) : (
                  <>
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
                    <p className="text-foreground">Pilih channel untuk memulai obrolan</p>
                  </>
                )}
              </div>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

// Komponen utama yang akan di-export, menggunakan Suspense
export default function AppWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        </div>
      }
    >
      <ChatContainer />
    </Suspense>
  );
}
