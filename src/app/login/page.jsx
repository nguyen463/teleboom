"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [loading, user, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoginLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
      localStorage.setItem("chat-app-token", response.data.token);
      localStorage.setItem("chat-user", JSON.stringify(response.data.user));
      router.push("/chat");
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Login gagal. Silakan coba lagi." });
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {errors.general && <p className="text-red-500 text-sm mb-4">{errors.general}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={credentials.email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loginLoading ? "Loading..." : "Login"}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          Belum punya akun?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
