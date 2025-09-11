import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://teleboom-694d2bc690c3.herokuapp.com";

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
        const response = await axios.get(`${API_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.valid) {
          const rawUser = localStorage.getItem("chat-user");
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          setUser({ ...parsedUser, token });
        } else {
          // token tidak valid → hapus dari storage
          localStorage.removeItem("chat-app-token");
          localStorage.removeItem("chat-user");
          setUser(null);
        }
      } catch (err) {
        // error saat verifikasi → hapus storage
        localStorage.removeItem("chat-app-token");
        localStorage.removeItem("chat-user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // cukup sekali jalan saat mount

  const logout = () => {
    localStorage.removeItem("chat-app-token");
    localStorage.removeItem("chat-user");
    setUser(null);
    router.push("/login");
  };

  return { user, loading, logout };
};
