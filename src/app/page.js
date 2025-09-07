// src/app/page.js

"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChatLayout from '../components/ChatLayout'; // Impor komponen chat kita

// Ini adalah komponen Halaman Selamat Datang (kode Anda sebelumnya)
function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-4xl font-bold mb-4">Selamat Datang!</h1>
        <p className="text-lg mb-6">Ini adalah halaman utama untuk aplikasi Rocket.Chat Clone.</p>
        <div className="space-x-4">
          <Link href="/login" className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Login
          </Link>
          <Link href="/register" className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

// Ini adalah komponen utama Halaman Depan
export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // State untuk loading

  useEffect(() => {
    // Cek token saat komponen dimuat
    const token = localStorage.getItem('chat-app-token');
    if (token) {
      setIsLoggedIn(true);
    }
    setIsLoading(false); // Selesai memeriksa
  }, []);

  // Tampilkan loading saat sedang memeriksa status login
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Tampilkan layout yang sesuai berdasarkan status login
  return isLoggedIn ? <ChatLayout /> : <LandingPage />;
}
