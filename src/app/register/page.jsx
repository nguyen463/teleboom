"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://teleboom-694d2bc690c3.herokuapp.com";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('chat-app-token');
    const user = localStorage.getItem('chat-user');
    
    if (!token || !user) {
      setCheckingAuth(false);
      return;
    }

    try {
      // Coba gunakan endpoint /verify terlebih dahulu
      const response = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.valid) {
        window.location.href = '/chat';
      } else {
        localStorage.removeItem('chat-app-token');
        localStorage.removeItem('chat-user');
        setCheckingAuth(false);
      }
    } catch (error) {
      console.log('Token validation check:', error.response?.status);
      
      // Jika endpoint /verify tidak ada (404), coba gunakan endpoint /me
      if (error.response?.status === 404) {
        try {
          const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (meResponse.data.user) {
            window.location.href = '/chat';
            return;
          }
        } catch (meError) {
          console.log('Both verify and me endpoints not available');
        }
      }
      
      localStorage.removeItem('chat-app-token');
      localStorage.removeItem('chat-user');
      setCheckingAuth(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = 'Mohon masukkan alamat email yang valid';
    }

    if (!formData.username || formData.username.length < 3 || formData.username.length > 30) {
      newErrors.username = 'Nama pengguna harus antara 3-30 karakter';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Nama pengguna hanya boleh berisi huruf, angka, dan underscore';
    }

    if (!formData.displayName || formData.displayName.length < 3 || formData.displayName.length > 50) {
      newErrors.displayName = 'Nama tampilan harus antara 3-50 karakter';
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password harus mengandung huruf besar, kecil, dan angka';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setLoading(true);

    try {
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }
      
      // Kirim data register ke backend
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim().toLowerCase(),
        displayName: formData.displayName.trim(),
        password: formData.password,
      });
      
      // Simpan token dan data user yang diterima dari register
      localStorage.setItem('chat-app-token', response.data.token);
      localStorage.setItem('chat-user', JSON.stringify(response.data.user));
      
      setSuccess('Akun berhasil dibuat! Anda akan diarahkan ke halaman chat...');

      // Redirect langsung ke halaman chat setelah register berhasil
      setTimeout(() => {
        window.location.href = '/chat';
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response?.data?.errors) {
        // Handle error validasi dari express-validator
        const backendErrors = {};
        err.response.data.errors.forEach((error) => {
          if (error.param) {
            backendErrors[error.param] = error.msg;
          }
        });
        setErrors(backendErrors);
      } else if (err.response?.data?.message) {
        // Handle error message umum
        if (err.response.data.message.includes('Email atau nama pengguna sudah terdaftar')) {
          setErrors({ general: 'Email atau nama pengguna sudah terdaftar' });
        } else {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: 'Pendaftaran gagal. Silakan coba lagi.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memeriksa status autentikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Buat Akun Baru</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Daftar untuk mulai menggunakan aplikasi chat
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="Masukkan alamat email"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pengguna
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Masukkan nama pengguna"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.username ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
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
              onChange={handleChange)
              placeholder="Masukkan nama tampilan Anda"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.displayName ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
            )}
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
              placeholder="Buat password (min. 8 karakter)"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Konfirmasi Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Konfirmasi password Anda"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Membuat Akun...
              </div>
            ) : (
              'Buat Akun'
            )}
          </button>
        </form>

        {errors.general && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            ⚠️ {errors.general}
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
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
            >
              Masuk di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
