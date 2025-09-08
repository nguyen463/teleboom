"use client";

import { useState } from 'react';
import axios from 'axios';

// URL backend-mu
const API_URL = "https://teleboom-backend-new-328274fe4961.herokuapp.com";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validasi input
      if (!formData.email || !formData.displayName || !formData.password || !formData.confirmPassword) {
        throw new Error('Mohon isi semua kolom yang diperlukan.');
      }

      if (formData.password.length < 6) {
        throw new Error('Password harus memiliki minimal 6 karakter');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Password tidak cocok');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Mohon masukkan alamat email yang valid.');
      }

      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        {
          email: formData.email,
          displayName: formData.displayName,
          password: formData.password
        }
      );
      
      setSuccess('Akun berhasil dibuat! Mengalihkan...');
      
      // Auto-login
      const loginResponse = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email: formData.email,
          password: formData.password
        }
      );
      
      localStorage.setItem('chat-app-token', loginResponse.data.token);
      localStorage.setItem('chat-user', JSON.stringify(loginResponse.data.user));
      
      window.location.href = '/';

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || err.message || 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Buat Akun Baru</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Masukkan alamat email Anda"
              className="w-full px-4 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Tampilan
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Nama yang akan ditampilkan"
              className="w-full px-4 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Buat password (min. 6 karakter)"
              className="w-full px-4 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Konfirmasi password Anda"
              className="w-full px-4 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
              loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Membuat Akun...
              </div>
            ) : (
              'Buat Akun'
            )}
          </button>
        </form>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">
            ✅ {success}
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Masuk di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
