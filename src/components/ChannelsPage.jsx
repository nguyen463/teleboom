"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import ChannelSelector from "./ChannelSelector";
import ChatLayout from "./ChatLayout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ChannelsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params; // ambil id dari URL /channels/:id
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [user, setUser] = useState(null);

  // Ambil user & token dari localStorage
  useEffect(() => {
    const rawUser = localStorage.getItem("chat-app-user");
    const token = localStorage.getItem("chat-app-token");

    if (!rawUser || !token) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(rawUser);
    setUser({ ...parsedUser, token });
  }, [router]);

  // Sinkronkan selectedChannelId dengan URL
  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    router.push(`/channels/${channelId}`);
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
          <ChatLayout
            user={user}
            channelId={selectedChannelId}
            logout={logout}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              Pilih channel untuk memulai obrolan
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
