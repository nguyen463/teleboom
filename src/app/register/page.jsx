"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_URL = "https://teleboom-694d2bc690c3.herokuapp.com/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { email, username, displayName, password, confirmPassword } = formData;

      if (!email || !username || !displayName || !password || !confirmPassword) {
        throw new Error("Mohon isi semua kolom.");
      }

      if (password.length < 6) throw new Error("Password minimal 6 karakter.");
      if (password !== confirmPassword) throw new Error("Password tidak cocok.");

      await axios.post(`${API_URL}/register`, {
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        displayName,
        password,
      });

      // Redirect ke login setelah registrasi sukses
      router.push("/login");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Pendaftaran gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Buat Akun Baru</h2>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <input
            type="text"
            name="displayName"
            placeholder="Display Name"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Konfirmasi Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 text-white rounded-md ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Sudah punya akun?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Masuk di sini
          </a>
        </p>
      </div>
    </div>
  );
}
