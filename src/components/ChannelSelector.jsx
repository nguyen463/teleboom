"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function ChannelSelector({ 
  user, 
  channels: propChannels = [], 
  loading: propLoading = false, 
  onSelectChannel, 
  onRefetch 
}) {
  const [localChannels, setLocalChannels] = useState(propChannels);
  const [localLoading, setLocalLoading] = useState(propLoading);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Sync dengan props dari parent
  useEffect(() => {
    setLocalChannels(propChannels);
  }, [propChannels]);

  useEffect(() => {
    setLocalLoading(propLoading);
  }, [propLoading]);

  // Helper: Transform extended JSON (extract $oid)
  const transformChannelData = (data) => {
    if (!data) return data;
    const transformed = { ...data };
    if (data._id && data._id.$oid) transformed._id = data._id.$oid;
    if (data.createdBy && data.createdBy.$oid) transformed.createdBy = data.createdBy.$oid;
    if (data.members && Array.isArray(data.members)) {
      transformed.members = data.members.map(m => m.$oid || m);
    }
    if (data.isPrivate === undefined && data.isDM !== undefined) transformed.isPrivate = data.isDM;
    console.log("Debug: Transformed channel:", transformed); // Debug transform
    return transformed;
  };

  // Fallback fetch kalau gak ada props channels
  useEffect(() => {
    if (propChannels.length > 0 || !user?.token) return;

    const fetchChannels = async () => {
      setLocalLoading(true);
      setError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";
        
        let response;
        try {
          response = await axios.get(`${API_URL}/api/channels`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
        } catch (firstError) {
          if (firstError.response?.status === 404) {
            response = await axios.get(`${API_URL}/channels`, {
              headers: { Authorization: `Bearer ${user.token}` },
            });
          } else {
            throw firstError;
          }
        }

        let data = response.data;
        let channelsList = [];
        if (Array.isArray(data)) {
          channelsList = data.map(transformChannelData);
        } else if (Array.isArray(data.channels)) {
          channelsList = data.channels.map(transformChannelData);
        } else if (data.data && Array.isArray(data.data)) {
          channelsList = data.data.map(transformChannelData);
        } else if (data.channel) {
          channelsList = [transformChannelData(data.channel)];
        } else {
          channelsList = [];
        }

        console.log("Debug: Final channels list length:", channelsList.length, "Sample:", channelsList[0]); // Debug list
        setLocalChannels(channelsList);
      } catch (err) {
        console.error("❌ Gagal mengambil channels:", err);
        setError("Gagal memuat daftar channel. Silakan coba lagi.");

        if (err.response?.status === 500) {
          setTimeout(() => fetchChannels(), 2000);
        }

        const msg = (err.response?.data?.message || "").toLowerCase();
        if (msg.includes("token") || msg.includes("autentikasi") || err.response?.status === 401) {
          localStorage.removeItem("chat-app-user");
          localStorage.removeItem("chat-app-token");
          router.push("/login");
        }
      } finally {
        setLocalLoading(false);
      }
    };

    fetchChannels();
  }, [user, router]);

  const handleChannelClick = (channelId) => {
    console.log("Debug: Channel clicked:", channelId);
    if (onSelectChannel) onSelectChannel(channelId);
  };

  const handleRefetch = () => {
    console.log("Debug: Refetch clicked");
    if (onRefetch) onRefetch();
    else window.location.reload();
  };

  const handleNewChannel = () => {
    console.log("Debug: Buat Channel clicked");
    router.push("/channels/new");
  };

  const combinedLoading = propLoading || localLoading;
  const combinedChannels = propChannels.length > 0 ? propChannels : localChannels;

  console.log("Debug: Rendering with combinedChannels length:", combinedChannels.length); // Debug render

  if (combinedLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Memuat channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={handleRefetch}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm pointer-events-auto"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 p-4 flex flex-col overflow-hidden relative z-10"> {/* Tambah z-10 biar clickable */}
      <h2 className="text-lg font-bold mb-4 text-gray-800">Channels</h2>
      
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {combinedChannels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm mb-4">Belum ada channel. Buat channel baru!</p>
            <p className="text-xs italic">Klik tombol di bawah untuk membuat.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {combinedChannels.map((channel) => {
              const channelId = channel._id || channel.id;
              if (!channelId) return null;
              const isPrivate = channel.isPrivate || channel.isDM;
              const memberCount = channel.members?.length || 0;
              return (
                <li
                  key={channelId}
                  className="p-3 bg-white rounded-md shadow-sm hover:bg-gray-50 cursor-pointer transition-colors pointer-events-auto"
                  onClick={() => handleChannelClick(channelId)}
                >
                  <h3 className="text-base font-medium text-gray-900 truncate">{channel.name || "Direct Message"}</h3>
                  <p className="text-xs text-gray-500">
                    {isPrivate ? "Private" : "Public"} • {memberCount} anggota
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      <div className="pt-2 border-t space-y-2">
        <button
          onClick={handleNewChannel}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm pointer-events-auto focus:outline-none focus:ring-2 focus:ring-blue-500" // FIX: Hapus disabled, tambah pointer-events & focus
        >
          + Buat Channel Baru
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("chat-app-user");
            localStorage.removeItem("chat-app-token");
            router.push("/login");
          }}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm pointer-events-auto focus:outline-none focus:ring-2 focus:ring-red-500" // FIX: Tambah pointer-events & focus
        >
          Logout
        </button>
      </div>
    </div>
  );
}
