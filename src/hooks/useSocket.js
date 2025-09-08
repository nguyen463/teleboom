// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);

  useEffect(() => {
    // Ambil URL socket dari environment
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001';

    console.log(`🔌 Connecting to socket server: ${SOCKET_URL}`);

    // Jika socket sudah terhubung, jangan buat baru
    if (socketRef.current && socketRef.current.connected) {
      console.log('✅ Socket already connected');
      setSocket(socketRef.current);
      setConnectionStatus('connected');
      return;
    }

    // Buat koneksi baru
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'], // Prioritaskan websocket
      path: '/socket.io',        // WAJIB untuk Heroku
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      secure: true,              // Paksa HTTPS untuk Heroku
      withCredentials: true,     // Izinkan cookie jika perlu
      pingInterval: 25000,       // Ping tiap 25 detik
      pingTimeout: 60000,        // Timeout 60 detik
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Event handler socket
    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionStatus('error');
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnecting... (attempt ${attempt})`);
      setConnectionStatus('connecting');
    });

    newSocket.on('reconnect', () => {
      console.log('✅ Socket reconnected');
      setConnectionStatus('connected');
    });

    // Cleanup saat komponen unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
        newSocket.off();
      }
    };
  }, []);

  return {
    socket,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
  };
}
