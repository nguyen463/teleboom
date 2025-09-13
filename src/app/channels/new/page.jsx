"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/app/utils/auth"; // Menggunakan path alias yang benar
import Link from "next/link";

export default function NewChannelPage() {
  const router = useRouter();
  const { user, loading, api, logout } = useAuth(); // Menggunakan useAuth hook
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Periksa autentikasi. useAuth sudah menangani loading dan redirect.
  // Kode ini hanya menunggu user dimuat dan melakukan redirect jika tidak ada
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nama channel tidak boleh kosong!");
      return;
    }

    if (name.trim().length > 50) {
      toast.error("Nama channel terlalu panjang (maks. 50 karakter)!");
      return;
    }

    if (!user?.token) {
      toast.error("Token tidak valid. Silakan login kembali.");
      logout(); // Panggil fungsi logout dari useAuth
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/api/channels", { name: name.trim(), isPrivate });

      console.log("Debug: Create response full:", res.data);
      
      const channelId = res.data.channel?._id || res.data._id || res.data.id;
      if (!channelId) {
        throw new Error("No channel ID in response");
      }

      toast.success("Channel berhasil dibuat!");
      
      setTimeout(() => {
        console.log("Debug: Redirecting to /channels?id=", channelId);
        router.push(`/channels?id=${channelId}`);
      }, 2000);
      
    } catch (err) {
      console.error("Error creating channel:", err);
      
      let errorMessage = "Gagal membuat channel";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.details) {
        errorMessage = Object.values(err.response.data.details).join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Tampilkan loading screen jika useAuth masih loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  // Jika tidak ada user, redirect sudah dihandle oleh useEffect
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
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
      
      <div className="bg-card p-6 rounded-lg shadow-md w-full max-w-md border border-border">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">Buat Channel Baru</h1>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nama Channel
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masukkan nama channel"
              required
              maxLength={50}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-foreground">
              Private Channel (hanya anggota yang bisa masuk)
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => router.push("/channels")}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/70 transition-colors"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
        <p className="mt-4 text-center text-sm text-foreground">
          <Link href="/channels" className="text-primary hover:underline">
            Kembali ke Channels
          </Link>
        </p>
      </div>
    </div>
  );
}
