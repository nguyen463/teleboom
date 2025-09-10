
// frontend/src/app/channels/[id]/page.jsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatLayout from "@/components/ChatLayout";
import axios from "axios";

export default function ChannelPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ambil data pengguna dari localStorage di sisi klien
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawUser = JSON.parse(localStorage.getItem("chat-user") || "{}");
      const token = localStorage.getItem("chat-app-token");
      setUser({
        id: rawUser.id,
        username: rawUser.username,
        displayName: rawUser.displayName,
        token,
      });
      setIsLoading(false);
    }
  }, []);

  // Validasi channelId dan autentikasi
  useEffect(() => {
    if (!id || !user?.token) {
      if (!isLoading) {
        router.push("/login");
      }
      return;
    }

    const validateChannel = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/channels`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        const validChannel = response.data.find(
          (channel) => channel._id === id
        );
        if (!validChannel) {
          router.push("/chat");
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || "Gagal memvalidasi channel";
        if (errorMsg.includes("token") || errorMsg.includes("autentikasi")) {
          router.push("/login");
        } else {
          router.push("/chat");
        }
      }
    };

    if (user?.token) {
      validateChannel();
    }
  }, [id, user, router, isLoading]);

  if (isLoading || !id || !user?.token) {
    return null;
  }

  return <ChatLayout user={user} channelId={id} />;
}
