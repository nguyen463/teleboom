"use client";

import { useState } from 'react';
import axios from 'axios';

const API_URL = "https://teleboom-backend-new-328274fe4961.herokuapp.com/api/auth";

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!credentials.email || !credentials.password) throw new Error('Isi semua kolom.');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.email)) throw new Error('Email tidak valid.');

      const response = await axios.post(`${API_URL}/login`, credentials);

      localStorage.setItem('chat-app-token', response.data.token);
      localStorage.setItem('chat-user', JSON.stringify(response.data.user));

      window.location.href = '/chat';
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login gagal.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Masuk ke Akun</h2>
        {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={credentials.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
            disabled={loading}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
