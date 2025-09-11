"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function ChannelSelector({ 
  user, 
  channels: propChannels = [], // Props dari parent (prioritas)
  loading: propLoading = false, 
  onSelectChannel, 
  onRefetch // Optional: Trigger refetch dari parent
}) {
  const [localChannels, setLocalChannels] = useState(propChannels);
  const [localLoading, setLocalLoading] = useState(propLoading);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Sync dengan props dari parent (kalau ada)
  useEffect(() => {
    console.log("Debug: Sync propChannels to local:", propChannels.length); // Debug props
    setLocalChannels(propChannels);
  }, [propChannels]);

  useEffect(() => {
    setLocalLoading(propLoading);
  }, [propLoading]);

  // Fallback fetch kalau gak ada props channels
  useEffect(() => {
    if (propChannels.length > 0 || !user?.token) {
      console.log("Debug: Skip fallback fetch - props provided or no token"); // Debug skip
      return;
    }

    console.log("Debug: Starting fallback fetch"); // Debug start

    const fetchChannels = async () => {
      setLocalLoading(true);
      setError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";
        
        let response;
        try {
          console.log("Debug: Trying /api/channels"); // Debug endpoint
          response = await axios.get(`${API_URL}/api/channels`, {
            headers: { Authorization: `Bearer ${user.token}` },
            timeout: 10000, // 10s timeout
          });
        } catch (firstError) {
          console.log("Debug: /api/channels failed, status:", firstError.response?.status); // Debug fallback
          if (firstError.response?.status === 404) {
            response = await axios.get(`${API_URL}/channels`, {
              headers: { Authorization: `Bearer ${user.token}` },
              timeout: 10000,
            });
          } else {
            throw firstError;
          }
        }

        console.log("Debug: Fetch success, response.data type:", typeof response.data, "isArray:", Array.isArray(response.data)); // Debug response

        // Handle berbagai format response
        let data = response.data;
        let newChannels = [];
        if (Array.isArray(data)) {
          newChannels = data;
        } else if (Array.isArray(data.channels)) {
          newChannels = data.channels;
        } else if (data.data && Array.isArray(data.data)) {
          newChannels = data.data;
        } else if (data.channel && typeof data.channel === 'object') {
          // Single channel (misal dari create) - tambah ke existing kalau ada
          newChannels = [...localChannels, data.channel];
        } else {
          newChannels = [];
        }

        console.log("Debug: Processed channels length:", newChannels.length); // Debug processed
        setLocalChannels(newChannels);
      } catch (err) {
        console.error("❌ Gagal mengambil channels:", err);
        setError("Gagal memuat daftar channel. Silakan coba lagi.");

        // Auto-retry sekali kalau 500
        if (err.response?.status === 500) {
          console.log("Debug: Auto-retry in 2s"); // Debug retry
          setTimeout(() => {
            fetchChannels(); // Recursive, tapi batasi manual (gak infinite)
          }, 2000);
        }

        // Redirect ke login kalau token invalid
        const msg = (err.response?.data?.message || "").toLowerCase();
        if (msg.includes("token") || msg.includes("autentikasi") || err.response?.status === 401) {
          console.log("Debug: Invalid token - logout"); // Debug logout
          localStorage.removeItem("chat-app-user");
          localStorage.removeItem("chat-app-token");
          router.push("/login");
        }
      } finally {
        setLocalLoading(false);
      }
    };

    fetchChannels();
  }, [user, router]); // Dependensi: user & router (gak propChannels biar fallback trigger sekali)

  const handleChannelClick = (channelId) => {
    console.log("Debug: handleChannelClick called with ID:", channelId); // Debug click
    if (onSelectChannel && channelId) {
      onSelectChannel(channelId);
    } else {
      console.warn("Debug: Invalid channelId or no onSelectChannel"); // Debug invalid
    }
  };

  const handleRefetch = () => {
    console.log("Debug: handleRefetch called"); // Debug refetch
    if (onRefetch) {
      onRefetch(); // Panggil parent refetch
    } else {
      // Fallback: Force reload page
      window.location.reload();
    }
  };

  const handleNewChannel = () => {
    console.log("Debug: handleNewChannel clicked - redirecting"); // Debug tombol
    router.push("/new-channel"); // FIX: Route sesuai kode create awal
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
      <h2 className="text-lg font-bold mb-4 text-gray-800">Channels</h2>
      
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {combinedChannels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm mb-4">Belum ada channel. Buat channel baru!</p>
            {/* FIX: Hilangkan tombol di sini - cuma text, biar gak duplikasi */}
            <p className="text-xs italic">Klik tombol di bawah untuk membuat.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {combinedChannels.map((channel) => {
              const channelId = channel._id || channel.id;
              if (!channelId) {
                console.warn("Debug: Skipping channel without ID:", channel); // Debug invalid channel
                return null;
              }
              const isPrivate = channel.isPrivate || channel.isDM;
              const memberCount = channel.members?.length || 0;
              return (
                <li
                  key={channelId}
                  className="p-3 bg-white rounded-md shadow-sm hover:bg-gray-50 cursor-pointer transition-colors"
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
      
      {/* Tombol action di bawah - SATU-SATUNYA TOMBOL BUAT CHANNEL */}
      <div className="pt-2 border-t space-y-2">
        <button
          onClick={handleNewChannel}
          disabled={combinedLoading} // Disable kalau loading
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Buat Channel Baru
        </button>
        {/* Logout button */}
        <button
          onClick={() => {
            console.log("Debug: Logout clicked"); // Debug logout
            localStorage.removeItem("chat-app-user");
            localStorage.removeItem("chat-app-token");
            router.push("/login");
          }}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
