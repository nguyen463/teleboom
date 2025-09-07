// src/hooks/useSocket.js

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    // Gunakan API URL sebagai fallback untuk socket URL
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:3001';

    console.log('🔄 Attempting to connect to socket server:', SOCKET_URL);

    // Buat koneksi socket
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      autoConnect: true,
      forceNew: true
    });

    // Event handlers untuk connection status
    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setConnectionStatus('connected');
    });

    newSocket.on('connecting', () => {
      console.log('🔄 Socket connecting...');
      setConnectionStatus('connecting');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionStatus('error');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnect attempt ${attemptNumber}`);
      setConnectionStatus('connecting');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnect error:', error.message);
      setConnectionStatus('error');
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnect failed');
      setConnectionStatus('error');
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('error');
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (newSocket.connected) {
        newSocket.disconnect();
      }
      setConnectionStatus('disconnected');
    };
  }, []);

  return { 
    socket, 
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error'
  };
}
