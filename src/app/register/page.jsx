"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from '../utils/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [registerLoading, setRegisterLoading] = useState(false);

  // Kalau sudah login, langsung ke chat
  if (!loading && user) {
    router.push("/chat");
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Mohon masukkan email valid.";
    }
    if (formData.username.length < 3) {
      newErrors.username = "Username minimal 3 karakter.";
    }
    if (formData.displayName.length < 3) {
      newErrors.displayName = "Nama tampilan minimal 3 karakter.";
    }
    if (formData.password.length < 8) {
      newErrors.password = "Password minimal 8 karakter.";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setRegisterLoading(true);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setRegisterLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, formData);
      localStorage.setItem("chat-app-token", response.data.token);
      localStorage.setItem("chat-user", JSON.stringify(response.data.user));
      router.push("/chat");
    } catch (err) {
      setErrors({
        general:
          err.response?.data?.message || "Registrasi gagal, silakan coba lagi.",
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
        {errors.general && (
          <p className="text-red-500 text-sm mb-4">{errors.general}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          {errors.username && (
            <p className="text-red-500 text-xs">{errors.username}</p>
          )}

          <input
            type="text"
            name="displayName"
            placeholder="Nama Tampilan"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          {errors.displayName && (
            <p className="text-red-500 text-xs">{errors.displayName}</p>
          )}

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          {errors.password && (
            <p className="text-red-500 text-xs">{errors.password}</p>
          )}

          <button
            type="submit"
            disabled={registerLoading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            {registerLoading ? "Loading..." : "Register"}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          Sudah punya akun?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
