"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatLayout from '@/components/ChatLayout';
import { validateToken } from '@/services/authService';

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('chat-app-token');
        const userData = sessionStorage.getItem('chat-user');

        if (!token || !userData) {
          router.push('/login');
          return;
        }

        // Validasi token
        const isValid = await validateToken(token);
        if (!isValid) {
          sessionStorage.removeItem('chat-app-token');
          sessionStorage.removeItem('chat-user');
          router.push('/login');
          return;
        }

        setUser(JSON.parse(userData));
        setError(null);
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Failed to validate session. Please login again.');
        
        // Hapus data session yang invalid
        sessionStorage.removeItem('chat-app-token');
        sessionStorage.removeItem('chat-user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-xl mb-4">Authentication Error</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <ChatLayout user={user} />;
}
