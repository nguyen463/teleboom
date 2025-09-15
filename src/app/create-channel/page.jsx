"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/app/utils/auth";

export default function CreateChannelPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://teleboom-694d2bc690c3.herokuapp.com";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama channel wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: user?.token ? `Bearer ${user.token}` : "",
        },
        body: JSON.stringify({
          name,
          description,
          isPrivate: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Gagal membuat channel");
      }

      toast.success("Channel berhasil dibuat ✅");

      // redirect ke channel baru
      router.push(`/channels/${data._id}`);
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-md">
      <h1 className="text-xl font-bold mb-4">Buat Channel Baru</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Channel</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-md p-2"
            placeholder="contoh: general"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-border rounded-md p-2"
            placeholder="opsional"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Membuat..." : "Buat Channel"}
        </button>
      </form>
    </div>
  );
}
