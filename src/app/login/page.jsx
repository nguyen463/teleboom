"use client";

import { useState } from 'react';
import axios from 'axios';

// Ganti dengan URL backend-mu saat deployment
const API_URL = "https://teleboom-backend-new-328274fe4961.herokuapp.com";

// Fungsi helper untuk validasi email sederhana
const isEmail = (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    identifier: '', // Kolom tunggal untuk email atau username
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!credentials.identifier.trim() || !credentials.password.trim()) {
        throw new Error('Mohon isi semua kolom.');
      }

      // Tentukan apakah input adalah email atau username
      const loginData = isEmail(credentials.identifier)
        ? { email: credentials.identifier, password: credentials.password }
        : { username: credentials.identifier, password: credentials.password };
      
      // Mengirimkan permintaan login
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        loginData // Mengirimkan data yang sesuai
      );

      // Simpan token dan data user ke localStorage
      localStorage.setItem('chat-app-token', response.data.token);
      localStorage.setItem('chat-user', JSON.stringify(response.data.user));
      
      // Mengalihkan ke halaman utama
      window.location.href = '/'; 

    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.msg || 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Masuk ke Akun Anda
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="identifier" className="sr-only">
                Email atau Nama Pengguna
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email atau Nama Pengguna"
                value={credentials.identifier}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin -ml-1 mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                  Memproses...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Belum punya akun?{' '}
              <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Daftar di sini
              </a>
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Demo:</strong> Anda bisa menggunakan nama pengguna dan _password_ apa pun untuk masuk. Sistem akan membuat akun tiruan untuk pengujian.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
