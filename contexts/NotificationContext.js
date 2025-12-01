import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Alert, ToastAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import PushNotification from 'react-native-push-notification';

const NotificationContext = createContext();

const SOCKET_URLS = [
  'https://supasoka-backend.onrender.com', // PRODUCTION - Primary
  'http://10.0.2.2:10000', // Android emulator fallback
  'http://localhost:10000', // Local development fallback
  'http://127.0.0.1:10000', // Local loopback fallback
  'http://192.168.1.100:10000', // Router IP fallback
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const currentUrlIndex = useRef(0);

  useEffect(() => {
    // Configure push notifications
    configurePushNotifications();
    
    loadNotifications();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const configurePushNotifications = () => {
    // Create notification channel for Android
    PushNotification.createChannel(
      {
        channelId: 'supasoka-default',
        channelName: 'Supasoka Notifications',
        channelDescription: 'Notifications from Supasoka',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Notification channel created: ${created}`)
    );

    // Configure push notifications
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('📱 Notification received:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          console.log('User tapped notification');
          // You can navigate to notifications screen here if needed
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    console.log('✅ Push notifications configured');
  };

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

  const connectSocket = () => {
    const socketUrl = SOCKET_URLS[currentUrlIndex.current];
    console.log(`🔌 Connecting to socket: ${socketUrl}`);

    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ Socket connection error: ${error.message}`);
      
      // Try next URL
      if (currentUrlIndex.current < SOCKET_URLS.length - 1) {
        currentUrlIndex.current++;
        setTimeout(() => {
          socket.disconnect();
          connectSocket();
        }, 1000);
      }
    });

    // Listen for channel updates
    socket.on('channels-updated', (data) => {
      console.log('📡 Channels updated:', data);
      showNotification({
        title: 'Vituo Vimebadilishwa',
        message: 'Vituo vipya vimeongezwa au kubadilishwa',
        type: 'channel_update',
      });
      
      // Trigger global refresh if function exists
      if (global.refreshChannels) {
        global.refreshChannels();
      }
    });

    // Listen for carousel updates
    socket.on('carousel-updated', (data) => {
      console.log('📡 Carousel updated:', data);
      showNotification({
        title: 'Picha Mpya',
        message: data.message || 'Picha za carousel zimebadilishwa',
        type: 'carousel_update',
      });
      
      // Trigger carousel refresh
      if (global.refreshCarousel) {
        global.refreshCarousel();
      }
    });

    // Listen for settings updates (contact settings)
    socket.on('settings-updated', (data) => {
      console.log('📡 Settings updated:', data);
      if (data.type === 'contact') {
        showNotification({
          title: 'Mipangilio Imebadilishwa',
          message: 'Namba za mawasiliano zimesasishwa',
          type: 'settings_update',
        });
        
        // Trigger contact settings refresh if function exists
        if (global.refreshContactSettings) {
          global.refreshContactSettings();
        }
      }
    });

    // Listen for admin messages
    socket.on('admin-message', (data) => {
      console.log('📡 Admin message:', data);
      showNotification({
        title: data.title || 'Ujumbe wa Msimamizi',
        message: data.message || 'Una ujumbe mpya',
        type: 'admin_message',
      });
    });

    // Listen for immediate notifications from admin
    socket.on('immediate-notification', (data) => {
      console.log('📡 Immediate notification received:', JSON.stringify(data, null, 2));
      
      // Map notification types to Swahili titles if not provided
      const typeToTitle = {
        'match_started': 'Mechi Imeanza',
        'goal': 'Goli!',
        'movie': 'Filamu Mpya',
        'general': 'Taarifa',
        'subscription': 'Usajili',
        'maintenance': 'Matengenezo',
        'channel_update': 'Vituo Vimebadilishwa',
        'admin_message': 'Ujumbe wa Msimamizi',
        'access_granted': 'Ufikiaji Umeidhinishwa',
        'carousel_update': 'Picha Mpya',
        'settings_update': 'Mipangilio Imebadilishwa'
      };
      
      const notificationTitle = data.title || typeToTitle[data.type] || 'Taarifa';
      
      showNotification({
        title: notificationTitle,
        message: data.message || 'Una taarifa mpya',
        type: data.type || 'general',
      });
    });

    // Listen for new notifications
    socket.on('new-notification', (data) => {
      console.log('📡 New notification received:', JSON.stringify(data, null, 2));
      
      // Map notification types to Swahili titles if not provided
      const typeToTitle = {
        'match_started': 'Mechi Imeanza',
        'goal': 'Goli!',
        'movie': 'Filamu Mpya',
        'general': 'Taarifa',
        'subscription': 'Usajili',
        'maintenance': 'Matengenezo',
        'channel_update': 'Vituo Vimebadilishwa',
        'admin_message': 'Ujumbe wa Msimamizi',
        'access_granted': 'Ufikiaji Umeidhinishwa',
        'carousel_update': 'Picha Mpya',
        'settings_update': 'Mipangilio Imebadilishwa'
      };
      
      const notificationTitle = data.title || typeToTitle[data.type] || 'Taarifa';
      
      showNotification({
        title: notificationTitle,
        message: data.message || 'Una taarifa mpya',
        type: data.type || 'general',
      });
    });

    // Listen for access granted
    socket.on('access-granted', (data) => {
      console.log('📡 Access granted:', data);
      showNotification({
        title: 'Ufikiaji Umeidhinishwa',
        message: data.message || 'Umepewa ufikiaji maalum',
        type: 'access_granted',
      });
    });

    // Listen for account activation (when admin grants time)
    socket.on('account-activated', async (data) => {
      console.log('📡 Account activated:', JSON.stringify(data, null, 2));
      
      try {
        // Update user data in storage
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.remainingTime = data.remainingTime || 0;
          user.isActivated = true;
          user.isSubscribed = true;
          user.accessLevel = data.accessLevel || 'premium';
          user.accessExpiresAt = data.expiresAt;
          await AsyncStorage.setItem('user', JSON.stringify(user));
          console.log('✅ User data updated with new time:', data.remainingTime);
        }

        // Update remaining time in AppState
        const remainingTime = data.remainingTime || 0;
        await AsyncStorage.setItem('remainingTime', remainingTime.toString());
        await AsyncStorage.setItem('isSubscribed', 'true');
        
        // Show notification
        showNotification({
          title: 'Akaunti Imewashwa! 🎉',
          message: data.message || `Muda wako: ${Math.floor(remainingTime / (24 * 60))} siku`,
          type: 'admin_activation',
        });

        console.log('✅ Account activation processed successfully');
      } catch (error) {
        console.error('❌ Error processing account activation:', error);
      }
    });

    socketRef.current = socket;
  };

  const showNotification = (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Show status bar notification using PushNotification
    PushNotification.localNotification({
      channelId: 'supasoka-default',
      title: notification.title || 'Supasoka',
      message: notification.message || 'Una taarifa mpya',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      priority: 'high',
      importance: 'high',
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: notification.message,
      subText: 'Supasoka',
      color: '#3b82f6',
      id: parseInt(newNotification.id),
      userInfo: {
        notificationId: newNotification.id,
        type: notification.type,
      },
    });

    // Also show toast for immediate feedback
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        `${notification.title}: ${notification.message}`,
        ToastAndroid.LONG
      );
    }

    // Add to notifications list
    addNotification(newNotification);
  };

  const addNotification = async (notification) => {
    const newNotifications = [notification, ...notifications].slice(0, 50);
    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
    
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updated);
    setUnreadCount(updated.filter(n => !n.read).length);
    
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    
    try {
      await AsyncStorage.removeItem('notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    connected,
    showNotification,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
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
