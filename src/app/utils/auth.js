"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

// Buat Axios instance global dengan interceptor
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request Interceptor: Auto-add Bearer token dari sessionStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("chat-app-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 auto-logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("chat-app-token");
      sessionStorage.removeItem("chat-app-user");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Buat Socket.IO instance (opsional, tapi disarankan untuk sinkronisasi)
const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const connectSocket = (token) => {
    socket.auth = { token };
    socket.connect();
  };

  const checkAuth = async () => {
    const token = sessionStorage.getItem("chat-app-token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Pake instance api (auto-header) untuk validasi
      const response = await api.get("/api/auth/validate");
      
      // Ambil data user dari respons API, ini lebih akurat dari localStorage
      const validatedUser = response.data.user || response.data;
      
      if (response.data.valid && validatedUser && validatedUser._id) {
        // Gabungkan data yang divalidasi dengan token
        // Gunakan _id yang sudah ada dari respons API
        const userWithId = { ...validatedUser, id: validatedUser._id, token };
        setUser(userWithId);
        
        // Simpan data user yang lengkap ke sessionStorage untuk sinkronisasi
        sessionStorage.setItem("chat-app-user", JSON.stringify(userWithId));
        
        // Sambungkan socket setelah autentikasi berhasil
        connectSocket(token);
      } else {
        sessionStorage.removeItem("chat-app-token");
        sessionStorage.removeItem("chat-app-user");
        setUser(null);
      }
    } catch (err) {
      console.warn("Auth validation failed:", err.response?.status || err.message);
      sessionStorage.removeItem("chat-app-token");
      sessionStorage.removeItem("chat-app-user");
      setUser(null);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = () => {
    sessionStorage.removeItem("chat-app-token");
    sessionStorage.removeItem("chat-app-user");
    setUser(null);
    socket.disconnect();
    router.push("/login");
  };

  return { user, loading, logout, api, socket };
};
