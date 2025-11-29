import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

// Fallback socket URLs (prioritize Render.com)
const FALLBACK_SOCKET_URLS = [
  'https://supasoka-backend.onrender.com', // Primary production
  'http://localhost:5000', // Local development
  'http://127.0.0.1:5000', // Local loopback
  'http://10.0.2.2:5000', // Android emulator
  'http://192.168.1.100:5000', // Common router IP
];

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.currentSocketURL = SOCKET_URL;
    this.connectionAttempts = 0;
  }

  async connect() {
    if (this.socket?.connected) {
      return;
    }

    await this.tryConnect();
  }

  async tryConnect(urlIndex = 0) {
    if (urlIndex >= FALLBACK_SOCKET_URLS.length) {
      console.error('❌ All socket URLs failed');
      return;
    }

    const socketURL = FALLBACK_SOCKET_URLS[urlIndex];
    console.log(`🔄 Attempting socket connection to: ${socketURL}`);

    try {
      const token = await SecureStore.getItemAsync('adminToken');
      
      this.socket = io(socketURL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false, // We'll handle reconnection manually
        timeout: 10000, // 10 second timeout
      });

      this.socket.on('connect', () => {
        console.log(`✅ Socket connected to ${socketURL}:`, this.socket.id);
        this.currentSocketURL = socketURL;
        this.connectionAttempts = 0;
        
        // Join admin room for admin-specific events
        this.socket.emit('join-admin-room');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        
        // Try to reconnect with next URL if disconnected due to network issues
        if (reason === 'io server disconnect' || reason === 'transport close') {
          setTimeout(() => this.tryConnect(urlIndex + 1), 2000);
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error(`❌ Socket connection error for ${socketURL}:`, error.message);
        
        // Try next URL after a short delay
        setTimeout(() => this.tryConnect(urlIndex + 1), 1000);
      });

      // Re-attach all listeners
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });

    } catch (error) {
      console.error(`Socket connection failed for ${socketURL}:`, error);
      // Try next URL
      setTimeout(() => this.tryConnect(urlIndex + 1), 1000);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

export default new SocketService();
