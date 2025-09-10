import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function ChannelSelector({ onSelectChannel }) {
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchChannels = async () => {
      const token = localStorage.getItem("chat-app-token");
      if (!token) {
        setError("Token tidak ditemukan. Silakan login kembali.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      try {
        const response = await axios.get("/api/channels", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const channels = response.data.filter(
          (channel) => channel._id && (channel.name || channel.isPrivate)
        );
        setChannels(channels);
        setError(null);
      } catch (error) {
        setError(error.response?.data?.message || "Gagal mengambil channel");
        if (process.env.NODE_ENV !== "production") {
          console.error("🔍 Gagal mengambil channel:", error);
        }
      }
    };
    fetchChannels();
  }, [router]);

  return (
    <div className="p-4 bg-gray-200">
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <h2 className="font-bold mb-2">Pilih Channel</h2>
      <div className="space-y-2">
        {channels.length === 0 ? (
          <p className="text-gray-500">Belum ada channel.</p>
        ) : (
          channels.map((channel) => (
            <button
              key={channel._id}
              onClick={() => onSelectChannel(channel._id)}
              className="block w-full text-left p-2 bg-white rounded-md hover:bg-gray-100"
            >
              {channel.name || "DM"} {channel.isPrivate && "(Pribadi)"}
              {channel.lastMessage && (
                <span className="text-sm text-gray-500 block">
                  Pesan terakhir: {channel.lastMessage.text || "Gambar"}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
