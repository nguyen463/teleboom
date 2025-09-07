"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Komponen Halaman Selamat Datang
function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900">
      <div className="p-8 bg-white rounded-lg shadow-lg text-center max-w-md mx-4">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">💬</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Selamat Datang!</h1>
          <p className="text-gray-600">Bergabunglah dengan komunitas chat kami yang menyenangkan</p>
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/login" 
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Masuk ke Akun
          </Link>
          <Link 
            href="/register" 
            className="block w-full px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Buat Akun Baru
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Dengan melanjutkan, Anda menyetujui{' '}
            <a href="#" className="text-blue-600 hover:underline">Syarat & Ketentuan</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Komponen utama Halaman Depan
export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Cek token di sessionStorage (bukan localStorage)
    const token = sessionStorage.getItem('chat-app-token');
    const userData = sessionStorage.getItem('chat-user');
    
    if (token && userData) {
      setIsLoggedIn(true);
      // Redirect ke halaman chat setelah login
      router.push('/chat');
    } else {
      setIsLoggedIn(false);
    }
    setIsLoading(false);
  }, [router]);

  // Tampilkan loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa status login...</p>
        </div>
      </div>
    );
  }

  // Jika sudah login, redirect dilakukan di useEffect
  // Jadi kita hanya perlu menampilkan LandingPage untuk yang belum login
  return <LandingPage />;
}
