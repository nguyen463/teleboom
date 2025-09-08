// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    // Gunakan API URL sebagai fallback untuk socket URL
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:3001';

    console.log('🔄 Attempting to connect to socket server:', SOCKET_URL);

    // Cek jika socket sudah ada dan terhubung
    if (socketRef.current && socketRef.current.connected) {
      console.log('✅ Socket already connected');
      setConnectionStatus('connected');
      setSocket(socketRef.current);
      return;
    }

    // Buat koneksi socket dengan konfigurasi khusus untuk Heroku
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: Infinity, // Coba reconnect terus menerus
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
      forceNew: false,
      // Konfigurasi khusus untuk Heroku
      pingTimeout: 60000, // 60 detik
      pingInterval: 25000, // 25 detik (harus kurang dari 30 detik timeout Heroku)
    });

    socketRef.current = newSocket;

    // Event handlers untuk connection status
    const handleConnect = () => {
      console.log('✅ Socket connected successfully');
      setConnectionStatus('connected');
      // Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleConnecting = () => {
      console.log('🔄 Socket connecting...');
      setConnectionStatus('connecting');
    };

    const handleConnectError = (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionStatus('error');
      
      // Coba reconnect setelah delay jika error
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting manual reconnect after error');
          if (newSocket && !newSocket.connected) {
            newSocket.connect();
          }
          reconnectTimeoutRef.current = null;
        }, 5000);
      }
    };

    const handleDisconnect = (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      
      // Coba reconnect untuk kasus disconnect tidak terduga
      if (reason === 'transport close' || reason === 'ping timeout' || reason === 'transport error') {
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting manual reconnect after disconnect');
            if (newSocket && !newSocket.connected) {
              newSocket.connect();
            }
            reconnectTimeoutRef.current = null;
          }, 3000);
        }
      }
    };

    const handleReconnect = (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
    };

    const handleReconnectAttempt = (attemptNumber) => {
      console.log(`🔄 Socket reconnect attempt ${attemptNumber}`);
      setConnectionStatus('connecting');
    };

    const handleReconnectError = (error) => {
      console.error('❌ Socket reconnect error:', error.message);
      setConnectionStatus('error');
    };

    const handleReconnectFailed = () => {
      console.error('❌ Socket reconnect failed');
      setConnectionStatus('error');
      
      // Coba reconnect manual setelah failure
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting manual reconnect after failure');
          if (newSocket && !newSocket.connected) {
            newSocket.connect();
          }
          reconnectTimeoutRef.current = null;
        }, 5000);
      }
    };

    const handleError = (error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('error');
    };

    // Attach event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('connecting', handleConnecting);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('reconnect', handleReconnect);
    newSocket.on('reconnect_attempt', handleReconnectAttempt);
    newSocket.on('reconnect_error', handleReconnectError);
    newSocket.on('reconnect_failed', handleReconnectFailed);
    newSocket.on('error', handleError);

    // Ping handler untuk menjaga koneksi tetap hidup di Heroku
    const keepAliveInterval = setInterval(() => {
      if (newSocket && newSocket.connected) {
        newSocket.emit('ping', { timestamp: Date.now() });
      }
    }, 20000); // Ping setiap 20 detik

    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      
      // Clear intervals
      clearInterval(keepAliveInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Remove all event listeners
      if (newSocket) {
        newSocket.off('connect', handleConnect);
        newSocket.off('connecting', handleConnecting);
        newSocket.off('connect_error', handleConnectError);
        newSocket.off('disconnect', handleDisconnect);
        newSocket.off('reconnect', handleReconnect);
        newSocket.off('reconnect_attempt', handleReconnectAttempt);
        newSocket.off('reconnect_error', handleReconnectError);
        newSocket.off('reconnect_failed', handleReconnectFailed);
        newSocket.off('error', handleError);
        
        // Only disconnect if no other components are using this socket
        if (newSocket.connected) {
          newSocket.disconnect();
        }
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
