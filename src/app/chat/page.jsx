"use client";

import { Suspense } from "react";
import ChannelSelector from "@/components/ChannelSelector";
import { useAuth } from '../utils/auth';
import ChatLayout from "@/components/ChatLayout";  // Asumsi ada ini buat chat area

export default function ChatPage() {
  const { user, loading } = useAuth();

  // Guard: Kalo loading, show loader. Kalo no user, return null (middleware udah handle redirect)
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
    return null;  // Middleware redirect ke /login?returnUrl=/chat
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-1/4 min-w-64 bg-gray-100 border-r border-gray-200">
        <ChannelSelector 
          user={user} 
          channels={[]}  // Dummy, atau fetch di sini kalo perlu
          loading={false}
          selectedChannelId={null}
          onSelectChannel={() => {}}  // Dummy handler
          onRefetch={() => {}}
          onCreateChannel={() => router.push('/channels/new')}  // Asumsi router
          onLogout={() => {}}  // Integrate sama useAuth logout
          error={null}
        />
      </div>
      
      {/* Chat Area - Wrap Suspense buat loading */}
      <div className="flex-1 flex flex-col" role="main">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        }>
          {/* Ganti sama ChatLayout kalo ada channel selected */}
          <ChatLayout user={user} channelId={null} onLogout={() => {}} />
        </Suspense>
      </div>
    </div>
  );
}
