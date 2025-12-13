import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import io from 'socket.io-client';

const API_BASE_URL = 'https://supasoka-backend.onrender.com/api';
const NotificationContext = createContext();

const SOCKET_URLS = [
  'https://supasoka-backend.onrender.com',
  'http://10.0.2.2:10000',
  'http://localhost:10000',
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = React.useRef(null);

  useEffect(() => {
    loadNotifications();
    connectSocket();
    setupFirebaseMessaging();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Setup Firebase Cloud Messaging
   * Handles foreground, background, and quit state notifications
   */
  const setupFirebaseMessaging = async () => {
    try {
      console.log('🔔 Setting up Firebase Messaging...');

      // Handle foreground notifications
      const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
        console.log('📱 Foreground notification received:', remoteMessage);

        if (remoteMessage.notification) {
          const notification = {
            id: remoteMessage.messageId || Date.now().toString(),
            title: remoteMessage.notification.title,
            message: remoteMessage.notification.body,
            type: remoteMessage.data?.type || 'general',
            timestamp: new Date().toISOString(),
            read: false
          };

          addNotification(notification);
        }
      });

      // Handle background/quit state notification tap
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('📱 Notification opened app from background:', remoteMessage);
        handleNotificationTap(remoteMessage);
      });

      // Check if app was opened from a quit state notification
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('📱 App opened from quit state notification:', initialNotification);
        handleNotificationTap(initialNotification);
      }

      console.log('✅ Firebase Messaging setup complete');

      return () => {
        unsubscribeForeground();
      };
    } catch (error) {
      console.error('❌ Firebase Messaging setup error:', error);
    }
  };

  /**
   * Handle notification tap
   */
  const handleNotificationTap = (remoteMessage) => {
    const type = remoteMessage.data?.type;

    if (global.navigateToScreen) {
      switch (type) {
        case 'access_granted':
        case 'subscription_granted':
          global.navigateToScreen('UserAccount');
          break;
        case 'channel_update':
          global.navigateToScreen('Home');
          break;
        default:
          break;
      }
    }
  };

  /**
   * Load notifications from storage
   */
  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  /**
   * Add notification to list
   */
  const addNotification = async (notification) => {
    try {
      const updated = [notification, ...notifications];
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.read).length);
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  /**
   * Connect to Socket.IO for real-time updates
   */
  const connectSocket = () => {
    const socketUrl = SOCKET_URLS[0];
    console.log(`🔌 Connecting to socket: ${socketUrl}`);

    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', async () => {
      console.log('✅ Socket connected');
      setConnected(true);

      // Join user room
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user?.id) {
            socket.emit('join-user', user.id);
            console.log(`📱 Joined user room: user-${user.id}`);
          }
        }
      } catch (error) {
        console.error('❌ Error joining user room:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    // Listen for real-time events
    socket.on('channels-updated', (data) => {
      console.log('📡 Channels updated:', data);
      if (global.refreshChannels) {
        global.refreshChannels();
      }
    });

    socket.on('carousel-updated', (data) => {
      console.log('📡 Carousel updated:', data);
      if (global.refreshCarousel) {
        global.refreshCarousel();
      }
    });

    socket.on('new-notification', (data) => {
      console.log('📡 New notification:', data);
      const notification = {
        id: data.id || Date.now().toString(),
        title: data.title || 'Taarifa',
        message: data.message,
        type: data.type || 'general',
        timestamp: data.timestamp || new Date().toISOString(),
        read: false
      };
      addNotification(notification);
    });

    socket.on('access-granted', async (data) => {
      console.log('🎉 Access granted:', data);

      // Calculate time and save to storage
      let timeInMinutes = 0;
      if (data.duration && data.unit) {
        switch (data.unit) {
          case 'minutes': timeInMinutes = parseInt(data.duration); break;
          case 'hours': timeInMinutes = parseInt(data.duration) * 60; break;
          case 'days': timeInMinutes = parseInt(data.duration) * 24 * 60; break;
          case 'months': timeInMinutes = parseInt(data.duration) * 30 * 24 * 60; break;
          default: timeInMinutes = parseInt(data.duration) * 24 * 60;
        }
      }

      const endTime = Date.now() + (timeInMinutes * 60 * 1000);

      await AsyncStorage.setItem('isSubscribed', 'true');
      await AsyncStorage.setItem('accessLevel', 'premium');
      await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
      await AsyncStorage.setItem('remainingTime', timeInMinutes.toString());

      console.log(`✅ Access granted: ${timeInMinutes} minutes`);

      if (global.reloadAppState) {
        await global.reloadAppState();
      }
      if (global.showSubscriptionGrantModal) {
        global.showSubscriptionGrantModal(timeInMinutes);
      }
      if (global.refreshChannels) {
        global.refreshChannels();
      }
    });

    socketRef.current = socket;
  };

  /**
   * Mark notification as read
   */
  const markAsRead = async (notificationId) => {
    try {
      const updated = notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.read).length);
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Clear all notifications
   */
  const clearAll = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      await AsyncStorage.removeItem('notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
