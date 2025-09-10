
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import ChannelSelector from "./ChannelSelector";
import ChatLayout from "./ChatLayout";

export default function ChannelsPage() {
  const router = useRouter();
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const rawUser = JSON.parse(localStorage.getItem("chat-app-user") || "{}");

  const user = useMemo(
    () => ({
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.displayName,
      token: localStorage.getItem("chat-app-token"),
    }),
    [rawUser.id, rawUser.username, rawUser.displayName]
  );

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    router.push(`/channels/${channelId}`);
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-100">
        <ChannelSelector onSelectChannel={handleSelectChannel} />
      </div>
      <div className="w-3/4">
        {selectedChannelId ? (
          <ChatLayout user={user} channelId={selectedChannelId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Pilih channel untuk memulai obrolan</p>
          </div>
        )}
      </div>
    </div>
  );
}
