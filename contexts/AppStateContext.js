import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const AppStateContext = createContext();

const SOCKET_URL = 'https://supasoka-backend.onrender.com';

export const AppStateProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [watchHistory, setWatchHistory] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [unlockedChannels, setUnlockedChannels] = useState([]);
  const [temporaryUnlockedChannels, setTemporaryUnlockedChannels] = useState([]); // In-memory only, not persisted
  const [adminGrantedAccess, setAdminGrantedAccess] = useState(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [subscriptionEndTime, setSubscriptionEndTime] = useState(null); // Timestamp when subscription ends
  const socketRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Load persisted data on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Load user data first (synchronously get from AsyncStorage)
      const userData = await AsyncStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;

      // Now setup socket with the loaded user data
      if (parsedUser) {
        setupSocketListeners(parsedUser);
      }

      // Load remaining data
      await loadPersistedData();
    };

    initializeApp();

    // Set global reload function for real-time updates
    global.reloadAppState = async () => {
      console.log('🔄 [Global] Reloading app state from storage...');
      await loadPersistedData();
      console.log('✅ [Global] App state reloaded');
    };

    return () => {
      delete global.reloadAppState;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Cleanup countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const loadPersistedData = async () => {
    try {
      const [
        userData,
        pointsData,
        timeData,
        subscribedData,
        watchHistoryData,
        pointsHistoryData,
        unlockedData,
        adminAccessData,
        endTimeData,
      ] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('points'),
        AsyncStorage.getItem('remainingTime'),
        AsyncStorage.getItem('isSubscribed'),
        AsyncStorage.getItem('watchHistory'),
        AsyncStorage.getItem('pointsHistory'),
        AsyncStorage.getItem('unlockedChannels'),
        AsyncStorage.getItem('adminGrantedAccess'),
        AsyncStorage.getItem('subscriptionEndTime'),
      ]);

      if (userData) setUser(JSON.parse(userData));
      if (pointsData) setPoints(parseInt(pointsData, 10));
      if (watchHistoryData) setWatchHistory(JSON.parse(watchHistoryData));
      if (pointsHistoryData) setPointsHistory(JSON.parse(pointsHistoryData));
      if (unlockedData) setUnlockedChannels(JSON.parse(unlockedData));
      
      // Load subscription end time and calculate remaining time
      // CRITICAL: This ensures countdown persists across app restarts
      if (endTimeData) {
        const endTime = parseInt(endTimeData, 10);
        
        // Calculate actual remaining time based on end time
        const now = Date.now();
        const remainingMs = endTime - now;
        
        if (remainingMs > 0) {
          // Subscription still active - calculate exact remaining time
          const remainingMinutes = remainingMs / (60 * 1000); // Keep decimal for precision
          setSubscriptionEndTime(endTime);
          setRemainingTime(remainingMinutes);
          setIsSubscribed(true);
          
          const days = Math.floor(remainingMinutes / (24 * 60));
          const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
          const mins = Math.floor(remainingMinutes % 60);
          console.log(`⏰ Subscription active: ${days}d ${hours}h ${mins}m remaining (end: ${new Date(endTime).toLocaleString()})`);
          
          // Start real-time countdown
          startRealtimeCountdown();
        } else {
          // Subscription expired
          console.log('⏰ Subscription expired - clearing data');
          setRemainingTime(0);
          setIsSubscribed(false);
          setSubscriptionEndTime(null);
          setHasAdminAccess(false);
          await AsyncStorage.removeItem('subscriptionEndTime');
          await AsyncStorage.removeItem('adminGrantedAccess');
          await AsyncStorage.setItem('remainingTime', '0');
          await AsyncStorage.setItem('isSubscribed', 'false');
        }
      } else if (timeData) {
        // Fallback to old system - convert to end time for consistency
        const minutes = parseInt(timeData, 10);
        if (minutes > 0) {
          const endTime = Date.now() + (minutes * 60 * 1000);
          setSubscriptionEndTime(endTime);
          setRemainingTime(minutes);
          setIsSubscribed(subscribedData === 'true');
          await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
          console.log(`⏰ Migrated old time format: ${minutes} minutes`);
          startRealtimeCountdown();
        } else {
          setRemainingTime(0);
          if (subscribedData) setIsSubscribed(subscribedData === 'true');
        }
      }

      // Load and check admin access
      if (adminAccessData) {
        const accessData = JSON.parse(adminAccessData);
        console.log('📦 Found adminGrantedAccess in storage:', accessData);
        const isValid = checkAdminAccessValidity(accessData);
        console.log('✅ Admin access validity:', isValid);
        if (isValid) {
          setAdminGrantedAccess(accessData);
          setHasAdminAccess(true);
          console.log('✅ hasAdminAccess set to TRUE');
          // Update remaining time from admin access
          const timeLeft = calculateRemainingTime(accessData);
          setRemainingTime(timeLeft);
          setIsSubscribed(true);
          console.log(`✅ Remaining time set to: ${timeLeft} minutes`);
        } else {
          // Access expired, clear it
          console.log('⏰ Admin access expired, clearing...');
          await clearAdminAccess();
        }
      } else {
        console.log('ℹ️ No adminGrantedAccess in storage');
        setHasAdminAccess(false);
      }

      console.log('✅ App state loaded from storage');
    } catch (error) {
      console.error('Error loading persisted data:', error);
    }
  };

  // Setup socket listeners for real-time admin updates
  const setupSocketListeners = (loadedUser) => {
    try {
      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ AppStateContext socket connected');
        // Join user room with the loaded user data
        if (loadedUser?.id) {
          socket.emit('join-user', loadedUser.id);
          console.log(`🔗 Emitted join-user event for user: ${loadedUser.id}`);
        } else {
          console.warn('⚠️ No user ID available for socket room');
        }
      });

      // Listen for admin-granted subscription
      socket.on('subscription-granted', async (data) => {
        console.log('🎉 Subscription granted by admin:', data);
        
        try {
          // Update subscription state with timestamp-based expiration
          const endTime = data.accessExpiresAtTime || data.subscriptionEndTime;
          
          if (endTime) {
            setSubscriptionEndTime(endTime);
            setRemainingTime(data.remainingTime || data.timeInMinutes);
            setIsSubscribed(true);
            setHasAdminAccess(true);
            
            // Save to AsyncStorage for persistence
            await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
            await AsyncStorage.setItem('remainingTime', (data.remainingTime || data.timeInMinutes).toString());
            await AsyncStorage.setItem('isSubscribed', 'true');
            await AsyncStorage.setItem('adminGrantedAccess', JSON.stringify({
              grantedAt: Date.now(),
              expiresAt: endTime,
              duration: data.duration,
              unit: data.unit,
              accessLevel: data.accessLevel || 'premium'
            }));
            
            // Start real-time countdown
            startRealtimeCountdown();
            
            console.log('✅ Subscription state updated - all channels unlocked!');
            console.log(`⏰ Expires at: ${new Date(endTime).toLocaleString()}`);
          }
        } catch (error) {
          console.error('❌ Error handling subscription-granted:', error);
        }
      });

      // Listen for subscription expiration
      socket.on('subscription-expired', async (data) => {
        console.log('⏰ Subscription expired:', data);
        
        try {
          // Clear subscription state
          setRemainingTime(0);
          setIsSubscribed(false);
          setHasAdminAccess(false);
          setSubscriptionEndTime(null);
          
          // Clear from AsyncStorage
          await AsyncStorage.removeItem('subscriptionEndTime');
          await AsyncStorage.removeItem('adminGrantedAccess');
          await AsyncStorage.setItem('remainingTime', '0');
          await AsyncStorage.setItem('isSubscribed', 'false');
          
          // Stop countdown
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          
          console.log('✅ Subscription cleared - access revoked');
        } catch (error) {
          console.error('❌ Error handling subscription-expired:', error);
        }
      });

      // NOTE: account-activated event is handled in NotificationContext
      // to ensure notifications are shown properly before state reload
      // This avoids race conditions between multiple listeners

      console.log('✅ Socket listeners setup complete');
    } catch (error) {
      console.error('❌ Error setting up socket listeners:', error);
    }
  };

  const updateUser = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const updatePoints = async (newPoints) => {
    setPoints(newPoints);
    await AsyncStorage.setItem('points', newPoints.toString());
  };

  const addPoints = async (amount, source = 'Unknown') => {
    const newPoints = points + amount;
    await updatePoints(newPoints);
    await addPointsToHistory(amount, source);
  };

  const spendPoints = async (amount, purpose = 'Unknown') => {
    if (points >= amount) {
      const newPoints = points - amount;
      await updatePoints(newPoints);
      await addPointsToHistory(-amount, purpose);
      return true;
    }
    return false;
  };

  const updateRemainingTime = async (minutes) => {
    setRemainingTime(minutes);
    await AsyncStorage.setItem('remainingTime', minutes.toString());
    
    // Also update subscription end time for accurate countdown
    if (minutes > 0) {
      const endTime = Date.now() + (minutes * 60 * 1000);
      setSubscriptionEndTime(endTime);
      await AsyncStorage.setItem('subscriptionEndTime', endTime.toString());
      console.log(`⏰ Subscription end time set: ${new Date(endTime).toLocaleString()}`);
    } else {
      setSubscriptionEndTime(null);
      await AsyncStorage.removeItem('subscriptionEndTime');
    }
  };

  const updateSubscriptionStatus = async (status) => {
    setIsSubscribed(status);
    await AsyncStorage.setItem('isSubscribed', status.toString());
  };

  const addWatchHistoryEntry = async (channel) => {
    const entry = {
      channelId: channel.id,
      channelName: channel.name,
      channelLogo: channel.logo,
      watchedAt: new Date().toISOString(),
      duration: 0,
    };

    const newHistory = [entry, ...watchHistory.filter(h => h.channelId !== channel.id)].slice(0, 10);
    setWatchHistory(newHistory);
    await AsyncStorage.setItem('watchHistory', JSON.stringify(newHistory));
  };

  const updateWatchDuration = async (channelId, duration) => {
    const newHistory = watchHistory.map(entry =>
      entry.channelId === channelId
        ? { ...entry, duration, watchedAt: new Date().toISOString() }
        : entry
    );
    setWatchHistory(newHistory);
    await AsyncStorage.setItem('watchHistory', JSON.stringify(newHistory));
  };

  const addPointsToHistory = async (amount, source) => {
    const entry = {
      id: Date.now().toString(),
      amount,
      source,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [entry, ...pointsHistory].slice(0, 20);
    setPointsHistory(newHistory);
    await AsyncStorage.setItem('pointsHistory', JSON.stringify(newHistory));
  };

  // Temporary unlock - NOT persisted to storage
  const unlockChannelTemporarily = (channelId) => {
    if (!temporaryUnlockedChannels.includes(channelId)) {
      const newUnlocked = [...temporaryUnlockedChannels, channelId];
      setTemporaryUnlockedChannels(newUnlocked);
      console.log('🔓 Channel temporarily unlocked (in-memory):', channelId);
    }
  };

  // Permanent unlock - persisted to storage (for subscriptions)
  const unlockChannel = async (channelId) => {
    if (!unlockedChannels.includes(channelId)) {
      const newUnlocked = [...unlockedChannels, channelId];
      setUnlockedChannels(newUnlocked);
      await AsyncStorage.setItem('unlockedChannels', JSON.stringify(newUnlocked));
      console.log('🔓 Channel permanently unlocked (persisted):', channelId);
    }
  };

  // Lock temporary unlock (for points-based access)
  const lockChannelTemporarily = (channelId) => {
    const newUnlocked = temporaryUnlockedChannels.filter(id => id !== channelId);
    setTemporaryUnlockedChannels(newUnlocked);
    console.log('🔒 Channel temporarily locked:', channelId);
  };

  // Lock permanent unlock
  const lockChannel = async (channelId) => {
    const newUnlocked = unlockedChannels.filter(id => id !== channelId);
    setUnlockedChannels(newUnlocked);
    await AsyncStorage.setItem('unlockedChannels', JSON.stringify(newUnlocked));
    console.log('🔒 Channel permanently locked:', channelId);
  };

  const isChannelUnlocked = (channelId) => {
    // Check both temporary and permanent unlocks
    return temporaryUnlockedChannels.includes(channelId) || unlockedChannels.includes(channelId);
  };


  // Check if user can access channels
  const canAccessChannels = () => {
    // Admin access grants full access
    if (hasAdminAccess) return true;

    // Subscription grants full access
    if (isSubscribed && remainingTime > 0) return true;

    return false;
  };

  // Admin Access Functions
  const grantAdminAccess = async (accessData) => {
    try {
      const access = {
        grantedAt: new Date().toISOString(),
        expiresAt: accessData.expiresAt,
        durationMinutes: accessData.durationMinutes,
        accessLevel: accessData.accessLevel || 'premium',
        grantedBy: accessData.grantedBy || 'admin',
      };

      await AsyncStorage.setItem('adminGrantedAccess', JSON.stringify(access));
      setAdminGrantedAccess(access);
      setHasAdminAccess(true);

      // Calculate and set remaining time
      const timeLeft = calculateRemainingTime(access);
      await updateRemainingTime(timeLeft);
      await updateSubscriptionStatus(true);

      // Start countdown timer
      startAccessCountdown();

      console.log('✅ Admin access granted:', access);
      return true;
    } catch (error) {
      console.error('Error granting admin access:', error);
      return false;
    }
  };

  const clearAdminAccess = async () => {
    try {
      await AsyncStorage.removeItem('adminGrantedAccess');
      setAdminGrantedAccess(null);
      setHasAdminAccess(false);
      await updateRemainingTime(0);
      await updateSubscriptionStatus(false);
      console.log('✅ Admin access cleared');
    } catch (error) {
      console.error('Error clearing admin access:', error);
    }
  };

  const checkAdminAccessValidity = (accessData) => {
    if (!accessData || !accessData.expiresAt) return false;
    const now = new Date();
    const expiresAt = new Date(accessData.expiresAt);
    return now < expiresAt;
  };

  const calculateRemainingTime = (accessData) => {
    if (!accessData || !accessData.expiresAt) return 0;
    const now = new Date();
    const expiresAt = new Date(accessData.expiresAt);
    const diffMs = expiresAt - now;
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  };

  // Real-time countdown that updates every second
  // CRITICAL: Always reads from AsyncStorage to ensure persistence across app restarts
  const startRealtimeCountdown = () => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let updateCounter = 0;
    let cachedEndTime = null;

    countdownIntervalRef.current = setInterval(async () => {
      try {
        // Read end time from storage if not cached or every 10 seconds
        if (!cachedEndTime || updateCounter % 10 === 0) {
          const storedEndTime = await AsyncStorage.getItem('subscriptionEndTime');
          if (storedEndTime) {
            cachedEndTime = parseInt(storedEndTime, 10);
          }
        }

        if (!cachedEndTime) {
          clearInterval(countdownIntervalRef.current);
          return;
        }

        const now = Date.now();
        const remainingMs = cachedEndTime - now;

        if (remainingMs <= 0) {
          // Subscription expired
          console.log('⏰ Subscription expired - stopping countdown');
          setRemainingTime(0);
          setIsSubscribed(false);
          setSubscriptionEndTime(null);
          setHasAdminAccess(false);
          await AsyncStorage.removeItem('subscriptionEndTime');
          await AsyncStorage.removeItem('adminGrantedAccess');
          await AsyncStorage.setItem('remainingTime', '0');
          await AsyncStorage.setItem('isSubscribed', 'false');
          clearInterval(countdownIntervalRef.current);
          cachedEndTime = null;
        } else {
          // Update remaining time every second (with decimal for seconds precision)
          const remainingMinutes = remainingMs / (60 * 1000);
          setRemainingTime(remainingMinutes);
          setSubscriptionEndTime(cachedEndTime);

          // Persist to AsyncStorage every 30 seconds to avoid excessive writes
          updateCounter++;
          if (updateCounter >= 30) {
            await AsyncStorage.setItem('remainingTime', Math.floor(remainingMinutes).toString());
            updateCounter = 0;
          }
        }
      } catch (error) {
        console.error('Error in countdown:', error);
      }
    }, 1000); // Update every second for real-time countdown

    console.log('⏰ Real-time countdown started');
  };

  const startAccessCountdown = () => {
    // Use the main countdown instead - it handles both subscription and admin access
    startRealtimeCountdown();
  };

  // Check if user has access to all channels (admin access or subscription)
  const hasFullAccess = () => {
    return hasAdminAccess || isSubscribed;
  };

  // Check if specific channel is accessible
  const canAccessChannel = (channelId) => {
    // Admin access grants access to all channels
    if (hasAdminAccess) return true;
    // Regular subscription grants access to all channels
    if (isSubscribed && remainingTime > 0) return true;
    // Check if channel is unlocked via points
    return unlockedChannels.includes(channelId);
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'user',
        'points',
        'remainingTime',
        'isSubscribed',
        'watchHistory',
        'pointsHistory',
        'unlockedChannels',
        'adminGrantedAccess',
      ]);

      setUser(null);
      setPoints(0);
      setRemainingTime(0);
      setIsSubscribed(false);
      setWatchHistory([]);
      setPointsHistory([]);
      setUnlockedChannels([]);
      setAdminGrantedAccess(null);
      setHasAdminAccess(false);

      console.log('✅ All app data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  // Start countdown on mount if admin access exists
  useEffect(() => {
    if (adminGrantedAccess && hasAdminAccess) {
      const cleanup = startAccessCountdown();
      return cleanup;
    }
  }, [adminGrantedAccess, hasAdminAccess]);

  // Format remaining time for display (e.g., "2d 5h 30m" or "45m")
  const formatRemainingTime = (minutes = remainingTime) => {
    if (!minutes || minutes <= 0) return 'Muda umeisha';
    
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Get remaining time in seconds for real-time display
  const getRemainingSeconds = () => {
    if (!subscriptionEndTime) return 0;
    const now = Date.now();
    const remainingMs = subscriptionEndTime - now;
    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  // Format time with seconds for real-time display
  const formatRemainingTimeWithSeconds = () => {
    if (!subscriptionEndTime) return 'Muda umeisha';
    
    const now = Date.now();
    const remainingMs = subscriptionEndTime - now;
    
    if (remainingMs <= 0) return 'Muda umeisha';
    
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((totalSeconds % (60 * 60)) / 60);
    const secs = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const value = {
    user,
    points,
    remainingTime,
    isSubscribed,
    watchHistory,
    pointsHistory,
    unlockedChannels,
    temporaryUnlockedChannels,
    adminGrantedAccess,
    hasAdminAccess,
    subscriptionEndTime,
    updateUser,
    updatePoints,
    addPoints,
    spendPoints,
    updateRemainingTime,
    updateSubscriptionStatus,
    addWatchHistoryEntry,
    updateWatchDuration,
    addPointsToHistory,
    unlockChannel,
    unlockChannelTemporarily,
    lockChannel,
    lockChannelTemporarily,
    isChannelUnlocked,
    canAccessChannels,
    clearAllData,
    grantAdminAccess,
    clearAdminAccess,
    hasFullAccess,
    canAccessChannel,
    calculateRemainingTime,
    formatRemainingTime,
    formatRemainingTimeWithSeconds,
    getRemainingSeconds,
    startRealtimeCountdown,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

export default AppStateContext;
