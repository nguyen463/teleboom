
"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ChannelSelector from "@/components/ChannelSelector";
import ChatLayout from "@/components/ChatLayout";
import { useAuth } from "../utils/auth";  // Sesuaikan path

export default function ChannelsPage() {
  const { user, loading, api } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const id = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState(null);
  const manualSelectionRef = useRef(false);

  const fetchChannels = useCallback(async () => {
    if (!user?.token || !api) return;

    setChannelsLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/channels");
      let channelsData = [];
      const data = response.data || { channels: [] };

      if (Array.isArray(data)) channelsData = data;
      else if (Array.isArray(data.channels)) channelsData = data.channels;
      else if (Array.isArray(data.data)) channelsData = data.data;
      else if (data.channel) channelsData = [data.channel];

      setChannels(channelsData || []);

      if (!manualSelectionRef.current && channelsData.length > 0) {
        const channelExists = channelsData.find(ch => ch._id === id || ch.id === id);
        if (channelExists && id && id !== "undefined") {
          setSelectedChannelId(id);
        } else if (!selectedChannelId) {
          setSelectedChannelId(channelsData[0]._id || channelsData[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
      setError("Gagal memuat channels. Silakan coba lagi.");
      if (err.response?.status === 401) router.push("/login");
    } finally {
      setChannelsLoading(false);
    }
  }, [user, id, api, router, selectedChannelId]);

  useEffect(() => {
    if (user && !channels.length) fetchChannels();
  }, [user, fetchChannels]);

  useEffect(() => {
    if (id && id !== "undefined" && id !== selectedChannelId && !manualSelectionRef.current) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = useCallback((channelId) => {
    if (!channelId || channelId === "undefined") return;
    manualSelectionRef.current = true;
    setSelectedChannelId(channelId);

    const params = new URLSearchParams(searchParams.toString());
    params.set("id", channelId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    setTimeout(() => { manualSelectionRef.current = false; }, 100);
  }, [searchParams, pathname, router]);

  const refetchChannels = useCallback(() => {
    manualSelectionRef.current = false;
    fetchChannels();
  }, [fetchChannels]);

  const handleCreateChannel = useCallback(() => {
    router.push("/channels/new");
  }, [router]);

  const { logout } = useAuth();  // Dari hook

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        <p className="text-gray-500">Memeriksa autentikasi...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white">
      <div className="w-1/4 min-w-64 bg-gray-100 border-r border-gray-200">
        <ChannelSelector
          user={user}
          channels={channels || []}
          loading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onRefetch={refetchChannels}
          onCreateChannel={handleCreateChannel}
          onLogout={logout}
          error={error}
        />
      </div>
      <div className="flex-1 flex flex-col" role="main">
        <Suspense fallback={<div className="animate-spin h-full">Loading...</div>}>
          {selectedChannelId && selectedChannelId !== "undefined" ? (
            <ChatLayout user={user} channelId={selectedChannelId} onLogout={logout} key={selectedChannelId} />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center p-6 max-w-md">
                {channelsLoading ? (
                  <><div className="animate-spin h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div><p className="text-gray-500">Memuat channels...</p></>
                ) : error ? (
                  <><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4"><svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><p className="text-red-500 mb-2">{error}</p><button onClick={refetchChannels} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Coba Lagi</button></>
                ) : channels.length === 0 ? (
                  <><div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4"><svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div><p className="text-gray-500 mb-2">Belum ada channel</p><button onClick={handleCreateChannel} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Buat Channel Pertama</button></>
                ) : (
                  <><div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4"><svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg></div><p className="text-gray-500">Pilih channel untuk memulai obrolan</p></>
                )}
              </div>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
