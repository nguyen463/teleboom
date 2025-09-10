"use client";

import ChannelSelector from "@/components/ChannelSelector";
import { useAuth } from '@/app/utils/auth';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-100">
        <ChannelSelector user={user} />
      </div>
    </div>
  );
}
