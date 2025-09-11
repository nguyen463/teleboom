import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

// Buat Axios instance global dengan interceptor (best practice: auto-add token & handle errors)
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,  // 10s timeout
});

// Request Interceptor: Auto-add Bearer token dari localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("chat-app-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 auto-logout, atau refresh logic (opsional)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token invalid/expired: Auto-logout
      localStorage.removeItem("chat-app-token");
      localStorage.removeItem("chat-app-user");
      // Redirect ke login (kalo di browser context)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("chat-app-token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/api/auth/validate");  // Pake instance api (auto-header)
        if (response.data.valid) {
          const rawUser = localStorage.getItem("chat-app-user");  // Unify key
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          setUser({ ...parsedUser, token });
        } else {
          // Token tidak valid → hapus dari storage
          localStorage.removeItem("chat-app-token");
          localStorage.removeItem("chat-app-user");
          setUser(null);
          router.push("/login");  // Auto-redirect
        }
      } catch (err) {
        console.warn("Auth validation failed:", err.response?.status || err.message);
        // Error saat verifikasi (401/500) → hapus storage & redirect
        localStorage.removeItem("chat-app-token");
        localStorage.removeItem("chat-app-user");
        setUser(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);  // Tambah router di deps (safe, nggak infinite loop)

  const logout = () => {
    localStorage.removeItem("chat-app-token");
    localStorage.removeItem("chat-app-user");
    setUser(null);
    router.push("/login");
  };

  // Export api instance buat pake di hook lain (misal fetchChannels)
  return { user, loading, logout, api };
};
