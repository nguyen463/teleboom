"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

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
  const [selectedChannel, setSelectedChannel] = useState(null);
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
    setSelectedChannel(channelId);
    if (onSelectChannel) onSelectChannel(channelId);
  };

  const handleRefetch = () => {
    if (onRefetch) onRefetch();
    else window.location.reload();
  };

  const handleNewChannel = (e) => {
    e.stopPropagation(); // Mencegah event bubbling
    router.push("/channels/new");
  };

  const combinedLoading = propLoading || localLoading;
  const combinedChannels = propChannels.length > 0 ? propChannels : localChannels;

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
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 p-4 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Channels</h2>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {combinedChannels.length} channel
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {combinedChannels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mx-auto mb-4 w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
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
              const isSelected = selectedChannel === channelId;
              
              return (
                <li
                  key={channelId}
                  className={`p-3 rounded-md cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-blue-100 border border-blue-300 shadow-sm" 
                      : "bg-white hover:bg-gray-50 shadow-sm"
                  }`}
                  onClick={() => handleChannelClick(channelId)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-medium text-gray-900 truncate flex items-center">
                      {channel.name || "Direct Message"}
                      {isPrivate && (
                        <span className="ml-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                    </h3>
                    {isSelected && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Aktif</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isPrivate ? "Private" : "Public"} • {memberCount} anggota
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      <div className="pt-2 border-t border-gray-200 space-y-2">
        <button
          onClick={handleNewChannel}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Channel Baru
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("chat-app-user");
            localStorage.removeItem("chat-app-token");
            router.push("/login");
          }}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}
