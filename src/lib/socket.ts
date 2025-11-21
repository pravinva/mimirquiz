// Use dynamic import to avoid build errors if socket.io-client is not installed
let socket: any = null;
let io: any = null;

// Dynamically import socket.io-client to avoid build errors if not installed
const loadSocketIO = () => {
  if (typeof window === 'undefined') return null;
  
  if (!io) {
    try {
      // Use require for server-side compatibility, but this will only work client-side
      io = require('socket.io-client');
    } catch (error) {
      console.warn('socket.io-client not available:', error);
      return null;
    }
  }
  return io;
};

export const initSocket = () => {
  const socketIO = loadSocketIO();
  if (!socketIO) {
    console.warn('socket.io-client not available');
    return null;
  }

  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8999';
    socket = socketIO.io(url, {
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    socket.on('connect_error', (error: any) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
