"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify"; // Asumsi toast udah di-import di parent atau global

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

  // ... (useEffect sync & fallback fetch sama seperti sebelumnya, gak berubah)

  // ... (handleChannelClick & handleRefetch sama)

  const handleNewChannel = async () => {
    console.log("Debug: handleNewChannel clicked - attempting router.push to /channels/new"); // Debug klik
    try {
      router.push("/channels/new"); // FIX: Route match src/app/channels/new/page.js
      console.log("Debug: router.push success - redirected to /channels/new");
    } catch (err) {
      console.error("Debug: router.push failed:", err); // Debug error
      toast.error("Gagal redirect - coba refresh halaman"); // Toast fallback
      // Fallback: Hard redirect
      window.location.href = "/channels/new";
    }
  };

  // ... (combinedLoading & combinedChannels sama)

  // ... (if loading & error sama)

  return (
    <div className="h-full bg-gray-100 p-4 flex flex-col overflow-hidden">
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
              if (!channelId) {
                console.warn("Debug: Skipping channel without ID:", channel);
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
      
      <div className="pt-2 border-t space-y-2">
        <button
          onClick={handleNewChannel}
          disabled={combinedLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Buat Channel Baru
        </button>
        <button
          onClick={() => {
            console.log("Debug: Logout clicked");
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
