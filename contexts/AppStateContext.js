import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [watchHistory, setWatchHistory] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [unlockedChannels, setUnlockedChannels] = useState([]);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    loadPersistedData();
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
        trialData,
      ] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('points'),
        AsyncStorage.getItem('remainingTime'),
        AsyncStorage.getItem('isSubscribed'),
        AsyncStorage.getItem('watchHistory'),
        AsyncStorage.getItem('pointsHistory'),
        AsyncStorage.getItem('unlockedChannels'),
        AsyncStorage.getItem('hasUsedTrial'),
      ]);

      if (userData) setUser(JSON.parse(userData));
      if (pointsData) setPoints(parseInt(pointsData, 10));
      if (timeData) setRemainingTime(parseInt(timeData, 10));
      if (subscribedData) setIsSubscribed(subscribedData === 'true');
      if (watchHistoryData) setWatchHistory(JSON.parse(watchHistoryData));
      if (pointsHistoryData) setPointsHistory(JSON.parse(pointsHistoryData));
      if (unlockedData) setUnlockedChannels(JSON.parse(unlockedData));
      if (trialData) setHasUsedTrial(trialData === 'true');

      console.log('✅ App state loaded from storage');
    } catch (error) {
      console.error('Error loading persisted data:', error);
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

  const unlockChannel = async (channelId) => {
    if (!unlockedChannels.includes(channelId)) {
      const newUnlocked = [...unlockedChannels, channelId];
      setUnlockedChannels(newUnlocked);
      await AsyncStorage.setItem('unlockedChannels', JSON.stringify(newUnlocked));
    }
  };

  const lockChannel = async (channelId) => {
    const newUnlocked = unlockedChannels.filter(id => id !== channelId);
    setUnlockedChannels(newUnlocked);
    await AsyncStorage.setItem('unlockedChannels', JSON.stringify(newUnlocked));
  };

  const isChannelUnlocked = (channelId) => {
    return unlockedChannels.includes(channelId);
  };

  const markTrialUsed = async () => {
    setHasUsedTrial(true);
    await AsyncStorage.setItem('hasUsedTrial', 'true');
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
        'hasUsedTrial',
      ]);

      setUser(null);
      setPoints(0);
      setRemainingTime(0);
      setIsSubscribed(false);
      setWatchHistory([]);
      setPointsHistory([]);
      setUnlockedChannels([]);
      setHasUsedTrial(false);

      console.log('✅ All app data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
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
    hasUsedTrial,
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
    lockChannel,
    isChannelUnlocked,
    markTrialUsed,
    clearAllData,
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
