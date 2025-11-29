import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext({});

export const SocketProvider = ({ children }) => {
  const { admin } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (admin) {
      // Connect socket when admin is logged in
      socketService.connect();

      socketService.on('connect', () => {
        setConnected(true);
      });

      socketService.on('disconnect', () => {
        setConnected(false);
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [admin]);

  return (
    <SocketContext.Provider value={{ socket: socketService, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
