"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket(token) {
  const socket = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Pastikan hanya konek sekali
    if (!socket.current) {
      socket.current = io(process.env.NEXT_PUBLIC_API_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      socket.current.on("connect", () => {
        console.log("✅ Socket connected:", socket.current.id);
      });

      socket.current.on("disconnect", () => {
        console.log("⚠️ Socket disconnected");
      });
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [token]);

  return socket.current;
}
