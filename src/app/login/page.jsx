"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from '@/app/utils/auth';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoginLoading(true);
    try {
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoginLoading(false);
        return;
      }

      const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
      localStorage.setItem("chat-app-token", response.data.token);
      localStorage.setItem("chat-user", JSON.stringify(response.data.user));
      router.push("/chat");
    } catch (err) {
      console.error("Login error:", err);
      localStorage.removeItem("chat-app-token");
      localStorage.removeItem("chat-user");
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
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memeriksa status autentikasi...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* ... sisa komponen login */}
      </div>
    </div>
  );
}
