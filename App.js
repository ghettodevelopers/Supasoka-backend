import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppStateProvider } from './contexts/AppStateContext';
import { ApiProvider } from './contexts/ApiContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ContactProvider } from './contexts/ContactContext';
import AppNavigator from './navigation/AppNavigator';

const App = () => {
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
