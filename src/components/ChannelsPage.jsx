"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChannelSelector from "./ChannelSelector";
import ChatLayout from "./ChatLayout";

export default function ChannelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(true);

  // Ambil user dari localStorage
  useEffect(() => {
    const rawUser = localStorage.getItem("chat-app-user");
    const token = localStorage.getItem("chat-app-token");

    if (!rawUser || !token) {
      router.push("/login");
      return;
    }

    setUser({
      ...JSON.parse(rawUser),
      token,
    });
    setLoading(false);
  }, [router]);

  // Fetch channels (dengan debug)
  const fetchChannels = async () => {
    if (!user) return;
    setChannelsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teleboom-694d2bc690c3.herokuapp.com';
      console.log("Debug: Fetching channels with token:", user.token ? "Yes" : "No");
      const res = await fetch(`${API_URL}/api/channels`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      console.log("Debug: Fetch response status:", res.status);

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("chat-app-user");
          localStorage.removeItem("chat-app-token");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Debug: Fetched channels data:", data);

      // Handle nested array kalau ada
      const channelsData = Array.isArray(data) ? data : (data.channels || data.data || []);
      setChannels(channelsData);
      console.log("Debug: Set channels length:", channelsData.length);

      // Auto-select kalau ada query id dan channel exist
      if (id && !selectedChannelId) {
        const channelExists = channelsData.find(ch => ch._id === id);
        if (channelExists) {
          setSelectedChannelId(id);
          console.log("Debug: Auto-selected channel:", id);
        } else {
          console.warn("Debug: Channel ID from query not found:", id);
        }
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
      // Optional: toast.error("Gagal load channels"); // Tambah kalau pake toast
    } finally {
      setChannelsLoading(false);
    }
  };

  // Call fetch setelah user ready
  useEffect(() => {
    fetchChannels();
  }, [user, id]);

  // Sinkronkan selectedChannelId dengan query param
  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = (channelId) => {
    console.log("Debug: handleSelectChannel called:", channelId);
    setSelectedChannelId(channelId);
    router.push(`/channels?id=${channelId}`, { shallow: true });
  };

  // Refetch tanpa reload full page
  const refetchChannels = () => {
    console.log("Debug: Refetch triggered");
    fetchChannels();
  };

  const logout = () => {
    localStorage.removeItem("chat-app-user");
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Memeriksa autentikasi...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-100 border-r">
        <ChannelSelector 
          user={user} 
          channels={channels}
          loading={channelsLoading}
          onSelectChannel={handleSelectChannel}
          onRefetch={refetchChannels}
        />
      </div>
      <div className="w-3/4">
        {selectedChannelId ? (
          <ChatLayout user={user} channelId={selectedChannelId} logout={logout} />
        ) : (
          <div className="flex items-center justify-center h-full">
            {channelsLoading ? (
              <p className="text-gray-500">Loading channels...</p>
            ) : channels.length === 0 ? (
              <div className="text-center">
                <p className="text-gray-500 mb-4">Belum ada channel. Buat sekarang!</p>
                {/* FIX: Hilangkan tombol di sini - biar gak duplikat dengan sidebar */}
                <p className="text-gray-400 text-sm">Gunakan tombol di sidebar untuk membuat channel baru.</p>
              </div>
            ) : (
              <p className="text-gray-500">Pilih channel untuk memulai obrolan</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
