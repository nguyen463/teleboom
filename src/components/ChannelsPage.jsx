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
  const [channels, setChannels] = useState([]); // BARU: State untuk list channels
  const [loading, setLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(true); // BARU: Loading khusus channels

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

  // BARU: Fetch channels setelah user ready
  useEffect(() => {
    if (!user) return;

    const fetchChannels = async () => {
      setChannelsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://teleboom-694d2bc690c3.herokuapp.com'}/api/channels`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Token invalid: Logout auto
            localStorage.removeItem("chat-app-user");
            localStorage.removeItem("chat-app-token");
            router.push("/login");
            return;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setChannels(data); // Asumsi response: array channels

        // Auto-select kalau ada query id dan channel exist
        if (id && !selectedChannelId) {
          const channelExists = data.find(ch => ch._id === id);
          if (channelExists) {
            setSelectedChannelId(id);
          }
        }
      } catch (err) {
        console.error("Error fetching channels:", err);
        // Optional: toast.error("Gagal load channels");
      } finally {
        setChannelsLoading(false);
      }
    };

    fetchChannels();
  }, [user, id, selectedChannelId]); // Re-fetch kalau id change (misal join baru)

  // Sinkronkan selectedChannelId dengan query param
  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    router.push(`/channels?id=${channelId}`, { shallow: true });
  };

  // BARU: Function buat refetch (pass ke child kalau perlu, misal setelah create/join)
  const refetchChannels = () => {
    // Trigger useEffect di atas
    window.location.href = `/channels?id=${selectedChannelId || ''}`; // Force shallow refresh
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
          channels={channels} // BARU: Pass list channels
          loading={channelsLoading}
          onSelectChannel={handleSelectChannel}
          onRefetch={refetchChannels} // Optional: Buat child trigger refetch
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
              <p className="text-gray-500">Belum ada channel. <a href="/new-channel" className="text-blue-500 underline">Buat sekarang!</a></p>
            ) : (
              <p className="text-gray-500">Pilih channel untuk memulai obrolan</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
