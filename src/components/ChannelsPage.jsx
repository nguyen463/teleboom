"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChannelSelector from "./ChannelSelector";
import ChatLayout from "./ChatLayout";

export default function ChannelsPage() {
  const router = useRouter();
  const { id } = router.query;

  const rawUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("chat-app-user")) || {};
    } catch {
      return {};
    }
  }, []);

  const user = useMemo(() => ({
    id: rawUser.id,
    username: rawUser.username,
    displayName: rawUser.displayName,
    token: localStorage.getItem("chat-app-token"),
  }), [rawUser]);

  const [selectedChannelId, setSelectedChannelId] = useState(id || null);

  useEffect(() => {
    if (!user?.token) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    router.push(`/channels/${channelId}`, undefined, { shallow: true });
  };

  const handleLogout = () => {
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
          <ChatLayout user={user} channelId={selectedChannelId} logout={handleLogout} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Pilih channel untuk memulai obrolan
          </div>
        )}
      </div>
    </div>
  );
}
