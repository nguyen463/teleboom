"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "../../components/ChannelSelector";
import ChatLayout from "../../components/ChatLayout";
import { useAuth } from "../utils/auth";
import { useTheme } from "../../components/ThemeContext";

function ChannelsPageContent() {
  const { user, loading: authLoading, api } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const id = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manualSelectionRef = useRef(false);

  /** 🔹 Fetch channel list dari API */
  const fetchChannels = useCallback(async () => {
    if (!user?.token) return;

    setChannelsLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/channels");
      const data = response.data || { channels: [] };
      let channelsData: any[] = [];

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

      // 🔹 Set default channel
      if (!manualSelectionRef.current && channelsData.length > 0) {
        const channelExists = channelsData.find(
          (ch) => ch._id === id || ch.id === id
        );
        if (channelExists && id && id !== "undefined") {
          setSelectedChannelId(id);
        } else if (!selectedChannelId) {
          setSelectedChannelId(channelsData[0]._id || channelsData[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error fetching channels:", err);
      setError("Gagal memuat channels. Silakan coba lagi.");
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setChannelsLoading(false);
    }
  }, [user, id, api, router, selectedChannelId]);

  /** 🔹 Fetch otomatis saat user tersedia */
  useEffect(() => {
    if (user) {
      fetchChannels();
    }
  }, [user, fetchChannels]);

  /** 🔹 Socket listener untuk update channel realtime */
  useEffect(() => {
    if (!user || !api?.socket) return;

    const socket = api.socket;
    socket.on("channelCreated", (newChannel: any) => {
      setChannels((prev) => [...prev, newChannel]);
    });

    return () => {
      socket.off("channelCreated");
    };
  }, [user, api]);

  /** 🔹 Pilih channel */
  const handleSelectChannel = useCallback(
    (channelId: string | null) => {
      if (!channelId || channelId === "undefined") return;
      manualSelectionRef.current = true;
      setSelectedChannelId(channelId);

      const params = new URLSearchParams(searchParams.toString());
      if (channelId) {
        params.set("id", channelId);
      } else {
        params.delete("id");
      }
      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });

      setTimeout(() => {
        manualSelectionRef.current = false;
      }, 100);
    },
    [searchParams, pathname, router]
  );

  /** 🔹 Sync jika URL berubah */
  useEffect(() => {
    if (
      id &&
      id !== "undefined" &&
      id !== selectedChannelId &&
      !manualSelectionRef.current
    ) {
      handleSelectChannel(id);
    }
  }, [id, selectedChannelId, handleSelectChannel]);

  /** 🔹 Refetch channel */
  const refetchChannels = useCallback(() => {
    manualSelectionRef.current = false;
    fetchChannels();
  }, [fetchChannels]);

  /** 🔹 Create channel */
  const handleCreateChannel = useCallback(() => {
    router.push("/channels/new");
  }, [router]);

  /** 🔹 Logout */
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("chat-app-user");
    sessionStorage.removeItem("chat-app-token");
    router.push("/login");
  }, [router]);

  /** 🔹 Delete channel */
  const handleDeleteChannel = useCallback(
    async (channelId: string) => {
      if (window.confirm("Apakah Anda yakin ingin menghapus channel ini?")) {
        try {
          await api.delete(`/api/channels/${channelId}`);
          setChannels((prev) =>
            prev.filter((ch) => (ch._id || ch.id) !== channelId)
          );

          if (selectedChannelId === channelId) {
            const newChannels = channels.filter(
              (ch) => (ch._id || ch.id) !== channelId
            );
            const newSelectedId =
              newChannels[0]?._id || newChannels[0]?.id || null;
            handleSelectChannel(newSelectedId);
          }
        } catch (err) {
          console.error("Gagal menghapus channel:", err);
          alert("Gagal menghapus channel. Hanya pemilik channel yang bisa menghapusnya.");
        }
      }
    },
    [api, channels, selectedChannelId, handleSelectChannel]
  );

  /** 🔹 Loading auth */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <p className="text-foreground">Memeriksa autentikasi...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Channel */}
      <div className="w-1/4 min-w-64 bg-secondary border-r border-border">
        <ChannelSelector
          user={user}
          channels={channels}
          loading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onRefetch={refetchChannels}
          onCreateChannel={handleCreateChannel}
          onLogout={handleLogout}
          error={error}
          onDeleteChannel={handleDeleteChannel}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background" role="main">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-background">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          {selectedChannelId && selectedChannelId !== "undefined" ? (
            <ChatLayout
              user={user}
              channelId={selectedChannelId}
              onLogout={handleLogout}
              key={selectedChannelId}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-center p-6 max-w-md">
                {channelsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-foreground">Memuat channels...</p>
                  </>
                ) : error ? (
                  <>
                    <p className="text-destructive-foreground mb-2">{error}</p>
                    <button
                      onClick={refetchChannels}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded"
                    >
                      Coba Lagi
                    </button>
                  </>
                ) : channels.length === 0 ? (
                  <>
                    <p className="text-foreground mb-2">Belum ada channel</p>
                    <button
                      onClick={handleCreateChannel}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded mt-2"
                    >
                      Buat Channel Pertama
                    </button>
                  </>
                ) : (
                  <p className="text-foreground">Pilih channel untuk memulai obrolan</p>
                )}
              </div>
            </div>
          )}
        </Suspense>
      </div>
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
