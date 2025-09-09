"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatLayout from "@/components/ChatLayout";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("chat-app-token");
    const userData = localStorage.getItem("chat-user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!data.valid) {
          localStorage.removeItem("chat-app-token");
          localStorage.removeItem("chat-user");
          router.push("/login");
          return;
        }

        setUser(JSON.parse(userData));
        setLoading(false);
      } catch (err) {
        console.error("❌ Gagal verifikasi token:", err);
        localStorage.removeItem("chat-app-token");
        localStorage.removeItem("chat-user");
        router.push("/login");
      }
    };

    verifyToken();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi token...</p>
        </div>
      </div>
    );
  }

  return <ChatLayout user={user} />;
}
