"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function LoginPage() {
  const router = useRouter();

  // 🔹 State
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 🔹 Hapus token & user
  const removeToken = () => {
    localStorage.removeItem("chat-app-token");
    localStorage.removeItem("chat-user");
  };

  // 🔹 Cek token saat load
  const checkAuthStatus = async () => {
    const token = localStorage.getItem("chat-app-token");
    const user = localStorage.getItem("chat-user");

    if (!token || !user) {
      setCheckingAuth(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.valid) {
        router.push("/chat");
      } else {
        removeToken();
        setCheckingAuth(false);
      }
    } catch (err) {
      console.error("Token verification error:", err);
      removeToken();
      setCheckingAuth(false);
    }
  };

  // 🔹 Update form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  // 🔹 Validasi form
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!credentials.email || !emailRegex.test(credentials.email)) {
      newErrors.email = "Mohon masukkan alamat email yang valid";
    }
    if (!credentials.password) {
      newErrors.password = "Password harus diisi";
    }

    return newErrors;
  };

  // 🔹 Submit login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    removeToken(); // hapus token lama

    try {
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API_URL}/api/auth/login`, credentials);

      localStorage.setItem("chat-app-token", response.data.token);
      localStorage.setItem("chat-user", JSON.stringify(response.data.user));

      router.push("/chat");
    } catch (err) {
      console.error("Login error:", err);
      if (err.response?.data?.errors) {
        const backendErrors = {};
        err.response.data.errors.forEach((error) => {
          backendErrors[error.path || "general"] = error.message || error.msg;
        });
        setErrors(backendErrors);
      } else if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: "Login gagal. Silakan coba lagi." });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memeriksa status autentikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Masuk ke Akun Anda</h1>
          <p className="mt-2 text-center text-sm text-gray-600">Silakan masuk untuk mengakses aplikasi chat</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">⚠️ {errors.general}</div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={credentials.email}
              onChange={handleChange}
              disabled={loading}
              placeholder="Alamat Email"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="Password"
              className={`w-full px-4 py-2 text-gray-900 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <div className="text-center text-sm text-gray-600">
            Belum punya akun? <a href="/register" className="text-blue-600 hover:text-blue-500 font-medium">Daftar di sini</a>
          </div>
        </form>
      </div>
    </div>
  );
}

// 🔹 Logout helper
export const logout = () => {
  localStorage.removeItem("chat-app-token");
  localStorage.removeItem("chat-user");
  window.location.href = "/login";
};
