"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function ChannelSelector({ user, onSelectChannel }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!user?.token) return;

    const fetchChannels = async () => {
      setLoading(true);
      setError(null);

      try {
        // Gunakan endpoint yang benar
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";
        
        // Coba beberapa endpoint yang mungkin
        let response;
        try {
          // Coba endpoint /api/channels dulu
          response = await axios.get(`${API_URL}/api/channels`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });
        } catch (firstError) {
          // Jika gagal, coba endpoint /channels (tanpa /api)
          if (firstError.response?.status === 404) {
            response = await axios.get(`${API_URL}/channels`, {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            });
          } else {
            throw firstError;
          }
        }

        // Pastikan response adalah array
        if (Array.isArray(response.data)) {
          setChannels(response.data);
        } else if (Array.isArray(response.data.channels)) {
          setChannels(response.data.channels);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          setChannels(response.data.data);
        } else {
          setChannels([]);
        }
      } catch (err) {
        console.error("❌ Gagal mengambil channels:", err);
        setError("Gagal memuat daftar channel. Silakan coba lagi.");

        // Redirect ke login kalau token invalid atau expired
        const msg = (err.response?.data?.message || "").toLowerCase();
        if (msg.includes("token") || msg.includes("autentikasi") || err.response?.status === 401) {
          localStorage.removeItem("chat-app-user");
          localStorage.removeItem("chat-app-token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [user, router]);

  const handleChannelClick = (channelId) => {
    if (onSelectChannel) onSelectChannel(channelId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Pilih Channel</h1>
        {channels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Belum ada channel. Buat channel baru!</p>
            <button
              onClick={() => router.push("/create-channel")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Buat Channel Baru
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {channels.map((channel) => (
                <li
                  key={channel._id || channel.id}
                  className="p-4 bg-white rounded-md shadow hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleChannelClick(channel._id || channel.id)}
                >
                  <h2 className="text-lg font-medium">{channel.name}</h2>
                  <p className="text-sm text-gray-600">
                    {channel.isPrivate ? "Private" : "Public"} • {channel.members?.length || 0} anggota
                  </p>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/create-channel")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Buat Channel Baru
            </button>
          </>
        )}
      </div>
    </div>
  );
}
