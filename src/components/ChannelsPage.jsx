"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ambil user dari localStorage
  useEffect(() => {
    const rawUser = localStorage.getItem("chat-app-user");
    const token = localStorage.getItem("chat-app-token");

    if (!rawUser || !token) {
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(rawUser);
      setUser({
        ...userData,
        token,
      });
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("chat-app-user");
      localStorage.removeItem("chat-app-token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch channels dengan useCallback untuk menghindari recreasi function
  const fetchChannels = useCallback(async () => {
    if (!user?.token) return;
    
    setChannelsLoading(true);
    setError(null);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teleboom-694d2bc690c3.herokuapp.com';
      
      let response;
      try {
        response = await fetch(`${API_URL}/api/channels`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } catch (firstError) {
        console.warn("First endpoint failed, trying alternative...");
        response = await fetch(`${API_URL}/channels`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("chat-app-user");
          localStorage.removeItem("chat-app-token");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle berbagai format response
      let channelsData = [];
      if (Array.isArray(data)) {
        channelsData = data;
      } else if (Array.isArray(data.channels)) {
        channelsData = data.channels;
      } else if (Array.isArray(data.data)) {
        channelsData = data.data;
      } else if (data.channel) {
        channelsData = [data.channel];
      }
      
      setChannels(channelsData);

      // Auto-select channel berdasarkan query parameter
      if (id && channelsData.length > 0) {
        const channelExists = channelsData.find(ch => 
          ch._id === id || ch.id === id
        );
        if (channelExists) {
          setSelectedChannelId(id);
        } else if (channelsData.length > 0) {
          // Jika channel dari query param tidak ditemukan, pilih channel pertama
          setSelectedChannelId(channelsData[0]._id || channelsData[0].id);
        }
      } else if (channelsData.length > 0 && !selectedChannelId) {
        // Jika tidak ada query param, pilih channel pertama
        setSelectedChannelId(channelsData[0]._id || channelsData[0].id);
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
      setError("Gagal memuat channels. Silakan coba lagi.");
    } finally {
      setChannelsLoading(false);
    }
  }, [user, id, router, selectedChannelId]);

  // Call fetch setelah user ready
  useEffect(() => {
    if (user && !channels.length) {
      fetchChannels();
    }
  }, [user, channels.length, fetchChannels]);

  // Sinkronkan selectedChannelId dengan query param
  useEffect(() => {
    if (id && id !== selectedChannelId) {
      setSelectedChannelId(id);
    }
  }, [id, selectedChannelId]);

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    // Update URL tanpa reload halaman
    const newUrl = `/channels${channelId ? `?id=${channelId}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  const refetchChannels = () => {
    fetchChannels();
  };

  const handleCreateChannel = () => {
    router.push("/channels/new");
  };

  const logout = () => {
    localStorage.removeItem("chat-app-user");
    localStorage.removeItem("chat-app-token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        <p className="text-gray-500">Memeriksa autentikasi...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="w-1/4 min-w-64 bg-gray-100 border-r border-gray-200">
        <ChannelSelector 
          user={user} 
          channels={channels}
          loading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onRefetch={refetchChannels}
          onCreateChannel={handleCreateChannel}
          onLogout={logout}
          error={error}
        />
      </div>
      <div className="flex-1 flex flex-col">
        {selectedChannelId ? (
          <ChatLayout 
            user={user} 
            channelId={selectedChannelId} 
            onLogout={logout} 
            key={selectedChannelId}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center p-6 max-w-md">
              {channelsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Memuat channels...</p>
                </>
              ) : error ? (
                <>
                  <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-500 mb-2">{error}</p>
                  <button 
                    onClick={refetchChannels}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Coba Lagi
                  </button>
                </>
              ) : channels.length === 0 ? (
                <>
                  <div className="mx-auto mb-4 w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-2">Belum ada channel</p>
                  <button
                    onClick={handleCreateChannel}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mt-2"
                  >
                    Buat Channel Pertama
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Pilih channel untuk memulai obrolan</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
