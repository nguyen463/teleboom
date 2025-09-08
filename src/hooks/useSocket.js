// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);

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

    // Buat koneksi socket
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      autoConnect: true,
      forceNew: false // Ubah ke false untuk menghindari multiple connections
    });

    socketRef.current = newSocket;

    // Event handlers untuk connection status
    const handleConnect = () => {
      console.log('✅ Socket connected successfully');
      setConnectionStatus('connected');
    };

    const handleConnecting = () => {
      console.log('🔄 Socket connecting...');
      setConnectionStatus('connecting');
    };

    const handleConnectError = (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionStatus('error');
    };

    const handleDisconnect = (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnectionStatus('disconnected');
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

    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      
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
