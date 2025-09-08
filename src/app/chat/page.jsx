"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatLayout from "@/components/ChatLayout";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem("chat-app-token");
        const userData = sessionStorage.getItem("chat-user");

        if (!token || !userData) {
          router.push("/login");
          return;
        }

        // VALIDASI TOKEN KE SERVER
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          sessionStorage.removeItem("chat-app-token");
          sessionStorage.removeItem("chat-user");
          router.push("/login");
          return;
        }

        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Token validation error:", error);
        sessionStorage.removeItem("chat-app-token");
        sessionStorage.removeItem("chat-user");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <ChatLayout user={user} />;
}
