"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// URL backend
const API_URL = "https://teleboom-backend-new-328274fe4961.herokuapp.com/api/auth";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { email, username, displayName, password, confirmPassword } = formData;

      if (!email || !username || !displayName || !password || !confirmPassword) {
        throw new Error("Mohon isi semua kolom.");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Mohon masukkan alamat email yang valid.");
      }

      if (password.length < 6) {
        throw new Error("Password harus memiliki minimal 6 karakter.");
      }

      if (password !== confirmPassword) {
        throw new Error("Password tidak cocok.");
      }

      // Kirim request registrasi ke backend
      const response = await axios.post(`${API_URL}/register`, { email, username, displayName, password });

      // Simpan token & user langsung jika mau langsung login
      localStorage.setItem("chat-app-token", response.data.token);
      localStorage.setItem("chat-user", JSON.stringify(response.data.user));

      // Redirect ke halaman chat
      router.push("/chat");

    } catch (err) {
      console.error("Register error:", err);
      setError(err.response?.data?.message || err.message || "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Buat Akun Anda</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Alamat Email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="username"
            placeholder="Nama Pengguna"
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="displayName"
            placeholder="Nama Tampilan"
            value={formData.displayName}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Konfirmasi Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Membuat Akun..." : "Buat Akun"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Sudah punya akun? <Link href="/login" className="text-blue-600 hover:text-blue-500">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}
