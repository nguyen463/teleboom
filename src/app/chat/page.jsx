"use client";

import { useEffect, useState } from 'react';
import ChatLayout from '../../components/ChatLayout'; // GAGAL. Harap periksa path ini.

// --- PENTING: Jika build gagal, periksa jalur impor ini. ---
// Pastikan folder dan nama file sudah benar, termasuk huruf besar/kecil.
// Contoh: `src/app/chat/page.jsx` mencoba mengimpor `src/components/ChatLayout.jsx`.
// Path yang benar seharusnya `../../components/ChatLayout`.

// Jika path di atas salah, coba gunakan path relatif yang benar sesuai struktur foldermu.

// Endpoint API autentikasi jika diperlukan
const AUTH_API_URL = "https://teleboom-backend-new-328274fe4961.herokuapp.com/api/auth";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('chat-app-token');
        const userData = localStorage.getItem('chat-user');

        if (!token || !userData) {
          // Arahkan ke halaman login jika token tidak ada
          window.location.href = '/login';
          return;
        }

        // Karena tidak bisa memvalidasi token dari frontend, kita asumsikan token valid jika ada.
        // Validasi sesungguhnya harus dilakukan di backend.
        setUser(JSON.parse(userData));
        setError(null);
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Gagal memuat sesi. Silakan login kembali.');
        
        // Hapus data yang tidak valid dari localStorage
        localStorage.removeItem('chat-app-token');
        localStorage.removeItem('chat-user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-xl mb-4">Kesalahan Otentikasi</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Pergi ke Halaman Login
          </a>
        </div>
      </div>
    );
  }

  return <ChatLayout user={user} />;
}
