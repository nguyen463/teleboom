"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChannelSelector from "./ChannelSelector";
import ChatLayout from "./ChatLayout";

export default function ChannelsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [user, setUser] = useState(null);

  // Ambil user dari localStorage hanya di client
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
  }, [router]);

  // Sinkronkan selectedChannelId dengan URL
  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    router.push(`/channels/${channelId}`, undefined, { shallow: true });
  };

  const logout = () => {
    localStorage.removeItem("chat-app-user");
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Memeriksa autentikasi...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-100 border-r">
        <ChannelSelector user={user} onSelectChannel={handleSelectChannel} />
      </div>
      <div className="w-3/4">
        {selectedChannelId ? (
          <ChatLayout user={user} channelId={selectedChannelId} logout={logout} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Pilih channel untuk memulai obrolan</p>
          </div>
        )}
      </div>
    </div>
  );
}
