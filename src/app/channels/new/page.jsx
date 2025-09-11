"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function NewChannelPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(null);

  // Ambil token dari localStorage hanya di client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("chat-app-user");
      const storedToken = localStorage.getItem("chat-app-token");
      
      // Cek kedua item, karena mungkin hanya satu yang ada
      if (!userData && !storedToken) {
        router.push("/login");
        return;
      }
      
      // Prioritaskan token dari manapun
      const tokenToUse = storedToken || (userData ? JSON.parse(userData).token : null);
      
      if (!tokenToUse) {
        router.push("/login");
        return;
      }
      
      setToken(tokenToUse);
    }
  }, [router]);

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nama channel tidak boleh kosong!");
      return;
    }

    if (name.trim().length > 50) { // Minor: Validasi client-side max length
      toast.error("Nama channel terlalu panjang (max 50 karakter)!");
      return;
    }

    if (!token) {
      toast.error("Token tidak valid. Silakan login kembali.");
      return;
    }

    setIsLoading(true);
    try {
      // Coba kedua endpoint yang mungkin
      let res;
      try {
        res = await axios.post(
          `${API_URL}/api/channels`,
          { name: name.trim(), isPrivate }, // Trim nama
          { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10s timeout
          }
        );
      } catch (firstError) {
        if (firstError.response?.status === 404) {
          // Coba endpoint tanpa /api
          res = await axios.post(
            `${API_URL}/channels`,
            { name: name.trim(), isPrivate },
            { 
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            }
          );
        } else {
          throw firstError;
        }
      }

      console.log("Debug: Create response full:", res.data); // Debug response

      // FIX: Handle nested response dari backend ({ channel: { _id: ... } })
      const channelId = res.data.channel?._id || res.data._id || res.data.id;
      if (!channelId) {
        throw new Error("No channel ID in response");
      }

      toast.success("Channel berhasil dibuat!");
      
      // FIX: Redirect dengan query id biar auto-select di ChannelsPage
      setTimeout(() => {
        console.log("Debug: Redirecting to /channels?id=", channelId); // Debug redirect
        router.push(`/channels?id=${channelId}`);
      }, 2000); // Sedikit lebih lama biar toast keliatan
      
    } catch (err) {
      console.error("Error creating channel:", err);
      
      // Error handling yang lebih spesifik
      let errorMessage = "Gagal membuat channel";
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.details) {
        // Handle validation details kalau ada
        errorMessage = Object.values(err.response.data.details).join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      
      // Jika token expired atau invalid, redirect ke login
      if (err.response?.status === 401) {
        localStorage.removeItem("chat-app-user");
        localStorage.removeItem("chat-app-token");
        setTimeout(() => router.push("/login"), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading sementara token belum siap
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Buat Channel Baru</h1>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Channel
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan nama channel"
              required
              maxLength={50} // Minor: Limit panjang
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
              Private Channel (hanya anggota yang bisa masuk)
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => router.push("/channels")}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block mr-2">⟳</span>
                  Membuat...
                </>
              ) : (
                "Buat Channel"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
