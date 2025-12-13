/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background message handler for Firebase Cloud Messaging
// This runs when app is in background or killed state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📱 Background FCM message received:', remoteMessage);
  // The notification will be displayed by the native SupasokaFirebaseMessagingService
  // This handler is for any additional data processing if needed
});

AppRegistry.registerComponent(appName, () => App);
