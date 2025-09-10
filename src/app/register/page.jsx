"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from 'src/app/utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://teleboom-694d2bc690c3.herokuapp.com";

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
  const [success, setSuccess] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Jika sudah terautentikasi, alihkan ke chat
  if (!loading && user) {
    router.push("/chat");
    return null;
  }
  
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) newErrors.email = "Mohon masukkan alamat email yang valid.";
    if (formData.username.length < 3) newErrors.username = "Username minimal 3 karakter.";
    if (formData.displayName.length < 3) newErrors.displayName = "Nama Tampilan minimal 3 karakter.";
    if (formData.password.length < 8) newErrors.password = "Password minimal 8 karakter.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");
    setRegisterLoading(true);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setRegisterLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, formData);
      setSuccess(response.data.message);
      localStorage.setItem("chat-app-token", response.data.token);
      localStorage.setItem("chat-user", JSON.stringify(response.data.user));
      router.push("/chat");
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Registrasi gagal, silakan coba lagi." });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        {/* ... sisa komponen register */}
      </div>
    </div>
  );
}
