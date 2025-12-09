import React, { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppStateProvider } from './contexts/AppStateContext';
import { ApiProvider } from './contexts/ApiContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ContactProvider } from './contexts/ContactContext';
import AppNavigator from './navigation/AppNavigator';
import userService from './services/userService';
import timeCheckerService from './services/timeCheckerService';
import adMobService from './services/adMobService';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    initializeApp();

    // Cleanup on unmount
    return () => {
      timeCheckerService.stopMonitoring();
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing Supasoka...');
      
      // Initialize AdMob FIRST
      console.log('📱 Initializing AdMob...');
      await adMobService.initialize();
      console.log('✅ AdMob ready');
      
      // Initialize user (registers with backend if new)
      const { user, isNewUser } = await userService.initializeUser();
      
      if (isNewUser) {
        console.log('🆕 New user registered:', user.uniqueUserId);
      } else {
        console.log('👤 Existing user loaded:', user.uniqueUserId);
      }

      // Start time monitoring for access control
      await timeCheckerService.startMonitoring();
      console.log('✅ Time monitoring initialized');
      
      setIsInitializing(false);
    } catch (error) {
      console.error('❌ App initialization error:', error);
      setInitError(error.message);
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>Inaanzisha Supasoka...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
          Hitilafu imetokea
        </Text>
        <Text style={{ color: '#999', textAlign: 'center' }}>
          {initError}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <AppStateProvider>
        <ApiProvider>
          <NotificationProvider>
            <ContactProvider>
              <AppNavigator />
            </ContactProvider>
          </NotificationProvider>
        </ApiProvider>
      </AppStateProvider>
    </GestureHandlerRootView>
  );
};

export default App;
