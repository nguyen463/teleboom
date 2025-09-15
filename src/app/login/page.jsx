"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
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

    if (!formData.email || !formData.password) {
      setError("Email dan password harus diisi");
      setLoading(false);
      return;
    }

    const loginData = {
      credential: formData.email, // backend pakai `credential`
      password: formData.password,
    };

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, loginData);
      console.log("✅ Server response:", response.data);

      const { token, user } = response.data;

      // Simpan token dan user di localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      console.log("✅ Token berhasil disimpan di localStorage.");
      console.log("👤 Data user:", localStorage.getItem("user"));

      // Redirect ke /channels
      router.push("/channels");
    } catch (err) {
      console.error("❌ Error saat login:", err);

      if (err.response) {
        console.log("📌 Response data:", err.response.data);
        console.log("📌 Response status:", err.response.status);
        setError(err.response.data?.message || "Login gagal. Periksa kredensial Anda.");
      } else if (err.request) {
        console.log("📌 No response received:", err.request);
        setError("Server tidak merespon. Coba lagi nanti.");
      } else {
        console.log("📌 Error setting up request:", err.message);
        setError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900">Log In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="email"
            placeholder="Email atau Username"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Memproses..." : "Log In"}
          </button>
        </form>
        {error && <p className="text-sm text-center text-red-600">{error}</p>}
        <p className="text-sm text-center text-gray-600">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
