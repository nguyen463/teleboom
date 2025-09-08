"use client";

import { useEffect, useState } from "react";
import ChatLayout from "../../../components/ChatLayout"; // Sesuaikan path ini

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("chat-app-token");
    const userData = localStorage.getItem("chat-user");

    if (!token || !userData) {
      // Redirect ke login jika token/user tidak ada
      window.location.href = "/login";
      return;
    }

    try {
      setUser(JSON.parse(userData));
      setError(null);
    } catch (err) {
      console.error("Auth parse error:", err);
      setError("Gagal memuat sesi. Silakan login kembali.");
      localStorage.removeItem("chat-app-token");
      localStorage.removeItem("chat-user");
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-xl mb-4">Kesalahan Otentikasi</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Pergi ke Halaman Login
          </a>
        </div>
      </div>
    );
  }

  return <ChatLayout user={user} />;
}
