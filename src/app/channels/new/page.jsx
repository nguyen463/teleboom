"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

export default function NewChannelPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(null);

  // Ambil token dari localStorage hanya di client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("chat-app-token");
      if (!storedToken) {
        router.push("/login");
      } else {
        setToken(storedToken);
      }
    }
  }, [router]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Nama channel tidak boleh kosong!");
      return;
    }

    if (!token) return; // token belum siap

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/channels`,
        { name, isPrivate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Channel berhasil dibuat!");
      router.push(`/channels/${res.data._id}`); // langsung ke channel baru
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Gagal membuat channel");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading sementara token belum siap
  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Memeriksa autentikasi...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Buat Channel Baru</h2>

        <label className="block mb-2 font-semibold">Nama Channel</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          placeholder="Masukkan nama channel"
        />

        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Private Channel (hanya anggota yang bisa masuk)</span>
        </label>

        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
        >
          {isLoading ? "Membuat..." : "Buat Channel"}
        </button>

        <button
          onClick={() => router.push("/channels")}
          className="w-full mt-2 text-gray-600 hover:underline"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
