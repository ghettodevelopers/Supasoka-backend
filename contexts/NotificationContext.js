import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { ToastAndroid, Platform, Vibration, AppState, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import PushNotification, { Importance } from 'react-native-push-notification';

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

  // Request notification permission for Android 13+
  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Supasoka Notification Permission',
            message: 'Supasoka inahitaji ruhusa ya kukutumia taarifa muhimu',
            buttonNeutral: 'Uliza Baadaye',
            buttonNegative: 'Hapana',
            buttonPositive: 'Sawa',
          }
        );
        console.log('📱 Notification permission:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Error requesting notification permission:', err);
        return false;
      }
    }
    return true; // Permission not needed for older Android versions
  };

  const configurePushNotifications = async () => {
    // Request permission first for Android 13+
    await requestNotificationPermission();

    // Create HIGH PRIORITY notification channel for Android (like WhatsApp/YouTube)
    PushNotification.createChannel(
      {
        channelId: 'supasoka-high-priority',
        channelName: 'Supasoka Taarifa Muhimu',
        channelDescription: 'Taarifa muhimu kutoka Supasoka - zinaonyeshwa juu ya screen',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH, // Use proper constant for heads-up notifications
        vibrate: true,
        vibration: 500,
        enableLights: true,
        lightColor: '#3b82f6',
        enableVibration: true,
        showBadge: true,
      },
      (created) => {
        console.log(`✅ High priority channel created: ${created}`);
        if (!created) {
          console.warn('⚠️ High priority channel already exists or failed to create');
        }
      }
    );

    // Create default notification channel
    PushNotification.createChannel(
      {
        channelId: 'supasoka-default',
        channelName: 'Supasoka Notifications',
        channelDescription: 'Taarifa za kawaida kutoka Supasoka',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH, // Changed to HIGH for better visibility
        vibrate: true,
        enableLights: true,
        lightColor: '#3b82f6',
        showBadge: true,
      },
      (created) => console.log(`✅ Default channel created: ${created}`)
    );

    // Create silent channel for background updates
    PushNotification.createChannel(
      {
        channelId: 'supasoka-silent',
        channelName: 'Supasoka Updates',
        channelDescription: 'Background updates',
        playSound: false,
        importance: Importance.LOW,
        vibrate: false,
      },
      (created) => console.log(`✅ Silent channel created: ${created}`)
    );

    console.log('🔔 Configuring push notifications...');
    
    // Configure push notifications with proper settings for status bar display
    PushNotification.configure({
      // Called when a notification is received (foreground/background)
      onNotification: function (notification) {
        console.log('📱 Notification received:', JSON.stringify(notification));

        // Handle notification tap - navigate to appropriate screen
        if (notification.userInteraction) {
          console.log('👆 User tapped notification:', notification.data);
          handleNotificationTap(notification);
        }

        // Required on iOS only
        if (Platform.OS === 'ios') {
          notification.finish('backgroundFetchResultNoData');
        }
      },

      // Called when a remote or local notification is opened or received
      onAction: function (notification) {
        console.log('🎯 Notification action:', notification.action);
      },

      // Called when the user fails to register for remote notifications
      onRegistrationError: function (err) {
        console.error('❌ Notification registration error:', err.message, err);
      },

      // IOS ONLY: Permissions to register for
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // Request permissions on iOS, Android 13+ handled separately
      requestPermissions: Platform.OS === 'ios',
    });

    console.log('✅ Push notifications configured for status bar display');
    
    // Test notification to verify system is working
    setTimeout(() => {
      console.log('🧪 Testing notification system...');
      PushNotification.localNotification({
        channelId: 'supasoka-high-priority',
        title: 'Supasoka Iko Tayari!',
        message: 'Taarifa zitaonyeshwa hapa. Karibu!',
        playSound: true,
        vibrate: true,
        priority: 'max',
        importance: 'high',
      });
      console.log('✅ Test notification sent');
    }, 3000); // Send test notification 3 seconds after app starts
  };

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationTap = (notification) => {
    const { type, data } = notification.data || {};

    // Trigger global navigation if available
    if (global.navigateToScreen) {
      switch (type) {
        case 'access_granted':
        case 'subscription_granted':
          global.navigateToScreen('UserAccount');
          break;
        case 'channel_update':
          global.navigateToScreen('Home');
          break;
        case 'admin_message':
        case 'general':
        default:
          // Stay on current screen or show notification details
          break;
      }
    }
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

    // Listen for access granted - UNLOCKS ALL CHANNELS
    socket.on('access-granted', async (data) => {
      console.log('🎉 ACCESS GRANTED EVENT RECEIVED!');
      console.log('📡 Data:', JSON.stringify(data, null, 2));

      try {
        // Calculate time in minutes
        let timeInMinutes = 0;
        if (data.duration && data.unit) {
          switch (data.unit) {
            case 'minutes': timeInMinutes = parseInt(data.duration); break;
            case 'hours': timeInMinutes = parseInt(data.duration) * 60; break;
            case 'days': timeInMinutes = parseInt(data.duration) * 24 * 60; break;
            case 'months': timeInMinutes = parseInt(data.duration) * 30 * 24 * 60; break;
            default: timeInMinutes = parseInt(data.duration) * 24 * 60;
          }
        } else if (data.timeInMinutes) {
          timeInMinutes = data.timeInMinutes;
        }

        // Calculate end time
        const endTime = Date.now() + (timeInMinutes * 60 * 1000);

        // CRITICAL: Save all access data to AsyncStorage
        await AsyncStorage.setItem('isSubscribed', 'true');
        await AsyncStorage.setItem('accessLevel', 'premium');
        await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
        await AsyncStorage.setItem('remainingTime', timeInMinutes.toString());

        // Save admin granted access data
        const adminAccessData = {
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(endTime).toISOString(),
          durationMinutes: timeInMinutes,
          duration: data.duration,
          unit: data.unit,
          accessLevel: 'premium',
          grantedBy: 'admin',
        };
        await AsyncStorage.setItem('adminGrantedAccess', JSON.stringify(adminAccessData));

        console.log(`✅ Access granted: ${timeInMinutes} minutes`);
        console.log(`⏰ End time: ${new Date(endTime).toLocaleString()}`);
        console.log(`🔓 ALL CHANNELS NOW UNLOCKED!`);

        // Show notification in status bar
        showNotification({
          title: '🎉 Ufikiaji Umeidhinishwa!',
          message: data.message || `Umepewa muda wa ${data.duration || timeInMinutes} ${data.unit || 'dakika'}. Furahia kuangalia vituo vyote!`,
          type: 'access_granted',
        });

        // CRITICAL: Reload app state to unlock all channels
        if (global.reloadAppState) {
          console.log('🔄 Reloading app state to unlock channels...');
          await global.reloadAppState();
          console.log('✅ App state reloaded!');
        }

        // Show grant modal
        if (global.showSubscriptionGrantModal) {
          global.showSubscriptionGrantModal(timeInMinutes);
        }

        // Refresh channels
        if (global.refreshChannels) {
          global.refreshChannels();
        }

        console.log('✅ All channels unlocked successfully - USER NOW HAS FULL ACCESS!');
      } catch (error) {
        console.error('❌ Error processing access grant:', error);
      }
    });

    // Listen for subscription granted (when admin grants time)
    socket.on('subscription-granted', async (data) => {
      console.log('🎉 SUBSCRIPTION GRANTED EVENT RECEIVED!');
      console.log('📡 Data:', JSON.stringify(data, null, 2));

      try {
        const timeInMinutes = data.timeInMinutes || 0;

        if (timeInMinutes <= 0) {
          console.error('❌ Invalid time received:', timeInMinutes);
          return;
        }

        // Calculate subscription end time
        const endTime = Date.now() + (timeInMinutes * 60 * 1000);

        // CRITICAL: Save all subscription data to AsyncStorage
        await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
        await AsyncStorage.setItem('remainingTime', timeInMinutes.toString());
        await AsyncStorage.setItem('isSubscribed', 'true');
        await AsyncStorage.setItem('accessLevel', 'premium');

        // Also save admin granted access data for tracking
        const adminAccessData = {
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(endTime).toISOString(),
          durationMinutes: timeInMinutes,
          duration: data.duration,
          unit: data.unit,
          accessLevel: 'premium',
          grantedBy: 'admin',
        };
        await AsyncStorage.setItem('adminGrantedAccess', JSON.stringify(adminAccessData));

        console.log(`✅ Subscription granted: ${timeInMinutes} minutes`);
        console.log(`⏰ End time: ${new Date(endTime).toLocaleString()}`);
        console.log(`🔓 ALL CHANNELS NOW UNLOCKED!`);

        // Show beautiful notification in status bar
        showNotification({
          title: '🎉 Hongera! Umepewa Muda!',
          message: `Umezawadiwa muda wa ${data.duration} ${data.unit}. Furahia kuangalia channel zote bila malipo!`,
          type: 'subscription_granted',
          data: { timeInMinutes, duration: data.duration, unit: data.unit },
        });

        // CRITICAL: Reload app state to unlock all channels immediately
        if (global.reloadAppState) {
          console.log('🔄 Reloading app state to unlock channels...');
          await global.reloadAppState();
          console.log('✅ App state reloaded - channels should be unlocked!');
        }

        // Show grant modal if function exists
        if (global.showSubscriptionGrantModal) {
          console.log('🎬 Showing subscription grant modal...');
          global.showSubscriptionGrantModal(timeInMinutes);
        }

        // Refresh channels to update UI
        if (global.refreshChannels) {
          console.log('🔄 Refreshing channels...');
          global.refreshChannels();
        }

        console.log('✅ Subscription grant processed successfully - USER NOW HAS FULL ACCESS!');
      } catch (error) {
        console.error('❌ Error processing subscription grant:', error);
      }
    });

    // Listen for account activation - UNLOCKS ALL CHANNELS
    socket.on('account-activated', async (data) => {
      console.log('🎉 ACCOUNT ACTIVATED EVENT RECEIVED!');
      console.log('📡 Data:', JSON.stringify(data, null, 2));

      try {
        const remainingTime = data.remainingTime || 0;

        if (remainingTime <= 0) {
          console.error('❌ Invalid time received:', remainingTime);
          return;
        }

        // Calculate end time
        const endTime = data.subscriptionEndTime || (Date.now() + (remainingTime * 60 * 1000));

        // Update user data in storage
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.remainingTime = remainingTime;
          user.isActivated = true;
          user.isSubscribed = true;
          user.accessLevel = data.accessLevel || 'premium';
          user.accessExpiresAt = data.expiresAt;
          await AsyncStorage.setItem('user', JSON.stringify(user));
          console.log('✅ User data updated with new time:', remainingTime);
        }

        // CRITICAL: Save all subscription data to AsyncStorage
        await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
        await AsyncStorage.setItem('remainingTime', remainingTime.toString());
        await AsyncStorage.setItem('isSubscribed', 'true');
        await AsyncStorage.setItem('accessLevel', data.accessLevel || 'premium');

        // Save admin granted access data for tracking
        const adminAccessData = {
          grantedAt: data.grantedAt || new Date().toISOString(),
          expiresAt: data.expiresAt || new Date(endTime).toISOString(),
          durationMinutes: remainingTime,
          accessLevel: data.accessLevel || 'premium',
          grantedBy: data.grantedBy || 'admin',
        };
        await AsyncStorage.setItem('adminGrantedAccess', JSON.stringify(adminAccessData));

        console.log(`✅ Account activated: ${remainingTime} minutes`);
        console.log(`⏰ End time: ${new Date(endTime).toLocaleString()}`);
        console.log(`🔓 ALL CHANNELS NOW UNLOCKED!`);

        // Show notification in status bar
        showNotification({
          title: '🎉 Akaunti Imewashwa!',
          message: data.message || `Umepewa muda wa kutazama vituo vyote! Furahia!`,
          type: 'admin_activation',
        });

        // CRITICAL: Reload app state to unlock all channels
        if (global.reloadAppState) {
          console.log('🔄 Reloading app state to unlock channels...');
          await global.reloadAppState();
          console.log('✅ App state reloaded!');
        }

        // Show grant modal
        if (global.showSubscriptionGrantModal) {
          global.showSubscriptionGrantModal(remainingTime);
        }

        // Refresh channels
        if (global.refreshChannels) {
          global.refreshChannels();
        }

        console.log('✅ Account activation processed - USER NOW HAS FULL ACCESS!');
      } catch (error) {
        console.error('❌ Error processing account activation:', error);
      }
    });

    socketRef.current = socket;
  };

  // Show notification like WhatsApp/YouTube - heads-up popup with sound
  const showNotification = (notification) => {
    console.log('🔔 showNotification called:', notification.title);
    
    // Generate unique ID for each notification
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const newNotification = {
      id: uniqueId.toString(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // ALL notifications should appear on status bar like WhatsApp/YouTube
    // Treat all admin-sent notifications as high priority for maximum visibility
    const isHighPriority = true; // Always high priority for status bar display

    // Determine vibration intensity based on notification type
    const isUrgent = [
      'access_granted',
      'subscription_granted',
      'admin_message',
      'match_started',
      'goal',
      'movie'
    ].includes(notification.type);

    // Vibrate device for ALL notifications (different patterns for urgent vs normal)
    if (isUrgent) {
      Vibration.vibrate([0, 250, 100, 250]); // Strong pattern for urgent
    } else {
      Vibration.vibrate([0, 200, 50, 200]); // Lighter pattern for general/subscription/maintenance
    }

    // Show HEADS-UP notification (like WhatsApp/YouTube)
    // This appears at the top of the screen even when using other apps
    // CRITICAL: Use proper Android notification settings for status bar display
    console.log('📤 Sending local notification to status bar...');
    console.log('   Title:', notification.title);
    console.log('   Message:', notification.message);
    console.log('   Channel:', isHighPriority ? 'supasoka-high-priority' : 'supasoka-default');
    
    try {
      PushNotification.localNotification({
      // Use HIGH PRIORITY channel for heads-up display
      channelId: isHighPriority ? 'supasoka-high-priority' : 'supasoka-default',

      // Notification content
      title: notification.title || 'Supasoka',
      message: notification.message || 'Una taarifa mpya',

      // Sound and vibration - CRITICAL for status bar visibility
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: isHighPriority ? 500 : 300,

      // HIGH PRIORITY settings for heads-up notification
      // These are CRITICAL for showing in status bar
      priority: 'max',
      importance: 'high',

      // Visual settings
      autoCancel: true,
      largeIcon: 'ic_launcher',
      // smallIcon: 'ic_notification', // Removed - causes issues if icon doesn't exist
      bigText: notification.message,
      subText: 'Supasoka',
      color: '#3b82f6',

      // Unique identification
      id: uniqueId,
      tag: `supasoka_${notification.type}_${uniqueId}`,
      group: 'supasoka_notifications',
      groupSummary: false,

      // User interaction data
      userInfo: {
        notificationId: newNotification.id,
        type: notification.type,
        timestamp: newNotification.timestamp,
        data: notification.data || {},
      },

      // CRITICAL: These settings make it appear in status bar like WhatsApp
      ongoing: false,
      onlyAlertOnce: false, // Alert every time
      ignoreInForeground: false, // SHOW even when app is open
      visibility: 'public', // Show on lock screen
      allowWhileIdle: true, // Show even in Doze mode
      invokeApp: false, // Don't auto-open app

      // CRITICAL: Show when screen is off
      when: Date.now(),
      showWhen: true,
      usesChronometer: false,
      timeoutAfter: null, // Don't auto-dismiss

      // Wake up screen for important notifications
      ...(isHighPriority && {
        fullScreenIntent: true,
        ticker: `${notification.title}: ${notification.message}`,
      }),
      });
      
      console.log('✅ Notification sent to Android system');
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      console.error('   Error details:', error.message);
    }

    // Also show toast for immediate in-app feedback
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        `${notification.title}`,
        ToastAndroid.SHORT
      );
    }

    // Add to notifications list (persistent storage)
    addNotification(newNotification);

    console.log(`🔔 Notification shown: ${notification.title} (ID: ${uniqueId}, Priority: ${isHighPriority ? 'HIGH' : 'NORMAL'})`);
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
    requestNotificationPermission,
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
