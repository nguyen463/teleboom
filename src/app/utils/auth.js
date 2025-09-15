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

// ===================== Axios Instance =====================
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request Interceptor: Auto-add Bearer token dari localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // ✅ konsisten dengan LoginPage.jsx
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ===================== Socket.io =====================
const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// ===================== useAuth Hook =====================
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sambungkan socket dengan token
  const connectSocket = (token) => {
    socket.auth = { token };
    socket.connect();
  };

  // Cek autentikasi saat pertama kali hook dipakai
  const checkAuth = async () => {
    const token = localStorage.getItem("token"); // ✅ localStorage
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Pastikan backend punya route validate
      const response = await api.get("/api/auth/validate");

      if (response.data.valid) {
        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser.id || parsedUser._id;

        if (!userId) {
          // Jika data user korup
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          router.push("/login");
          return;
        }

        const userWithId = { ...parsedUser, id: userId, token };
        setUser(userWithId);

        // Connect socket setelah autentikasi valid
        connectSocket(token);
      } else {
        // Token tidak valid
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        router.push("/login");
      }
    } catch (err) {
      console.warn("Auth validation failed:", err.response?.status || err.message);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [router]);

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    socket.disconnect();
    router.push("/login");
  };

  return { user, loading, logout, api, socket };
};
