"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatLayout from "@/components/ChatLayout";
import { useSocket } from "@/hooks/useSocket";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const token = typeof window !== "undefined" ? sessionStorage.getItem("chat-app-token") : null;
  const socket = useSocket(token);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!token) {
          router.replace("/login");
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          sessionStorage.clear();
          router.replace("/login");
          return;
        }

        const userData = sessionStorage.getItem("chat-user");
        if (!userData) {
          router.replace("/login");
          return;
        }

        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Auth error:", error);
        sessionStorage.clear();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <ChatLayout user={user} socket={socket} />;
}
