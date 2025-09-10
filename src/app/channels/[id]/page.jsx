"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatLayout from "@/components/ChatLayout";
import { useAuth } from "@/hooks/useAuth";

export default function ChannelPage({ params }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

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

  if (!user || !id) {
    return null;
  }

  return <ChatLayout user={user} channelId={id} logout={logout} />;
}
