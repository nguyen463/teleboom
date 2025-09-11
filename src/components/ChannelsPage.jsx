"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChannelSelector from "./ChannelSelector";
import ChatLayout from "./ChatLayout";

export default function ChannelsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  // Ambil user dari localStorage
  const rawUser = useMemo(
    () => JSON.parse(localStorage.getItem("chat-app-user") || "{}"),
    []
  );
  const token = localStorage.getItem("chat-app-token");

  const user = useMemo(
    () => ({
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.displayName,
      token,
    }),
    [rawUser, token]
  );

  // Sinkronkan selectedChannelId dengan URL
  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  // Redirect kalau user belum login
  useEffect(() => {
    if (!user?.token) {
      router.push("/login");
    }
  }, [user, router]);

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    router.push(`/channels/${channelId}`, undefined, { shallow: true });
  };

  const logout = () => {
    localStorage.removeItem("chat-app-user");
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

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
