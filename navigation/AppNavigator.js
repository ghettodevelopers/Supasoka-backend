import React, { useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Linking, Alert, Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useContact } from '../contexts/ContactContext';
import HomeScreen from '../screens/HomeScreen';
import AllChannelsScreen from '../screens/AllChannelsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import UserAccount from '../screens/UserAccount';
import PaymentScreen from '../screens/PaymentScreen';
import SupportScreen from '../screens/SupportScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const MainTabs = () => {
  const { contactSettings, loading } = useContact();
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactType, setContactType] = useState(''); // 'call' or 'whatsapp'
  const modalScaleAnim = useRef(new Animated.Value(0)).current;

  const showContactUnavailableModal = (type) => {
    setContactType(type);
    setShowContactModal(true);
    Animated.spring(modalScaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const closeContactModal = () => {
    Animated.timing(modalScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowContactModal(false);
    });
  };

  const handleCallPress = () => {
    if (loading) {
      Alert.alert('Subiri', 'Inapakia taarifa za mawasiliano...');
      return;
    }

    if (!contactSettings?.callUrl) {
      showContactUnavailableModal('call');
      return;
    }

    Linking.openURL(contactSettings.callUrl).catch(() => {
      Alert.alert('Hitilafu', 'Imeshindwa kufungua simu');
    });
  };

  const handleWhatsAppPress = () => {
    if (loading) {
      Alert.alert('Subiri', 'Inapakia taarifa za mawasiliano...');
      return;
    }

    if (!contactSettings?.whatsappUrl) {
      showContactUnavailableModal('whatsapp');
      return;
    }

    Linking.openURL(contactSettings.whatsappUrl).catch(() => {
      Alert.alert('Hitilafu', 'Imeshindwa kufungua WhatsApp');
    });
  };

  return (
    <>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1f2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="home" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AllChannels"
        component={AllChannelsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="television" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Payment"
        component={PaymentScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="credit-card" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CallUs"
        component={SupportScreen}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleCallPress();
          },
        }}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="phone" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WhatsApp"
        component={SupportScreen}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleWhatsAppPress();
          },
        }}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="whatsapp" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="UserAccount"
        component={UserAccount}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="account-circle" size={28} color={color} />
          ),
        }}
      />
    </Tab.Navigator>

    {/* Contact Unavailable Modal */}
    <Modal
      visible={showContactModal}
      transparent
      animationType="fade"
      onRequestClose={closeContactModal}
    >
      <View style={styles.contactModalOverlay}>
        <Animated.View
          style={[
            styles.contactModalContent,
            {
              transform: [{ scale: modalScaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.contactIconContainer}>
            <LinearGradient
              colors={contactType === 'call' ? ['#3b82f6', '#2563eb'] : ['#25D366', '#128C7E']}
              style={styles.contactIconGradient}
            >
              <Icon 
                name={contactType === 'call' ? 'phone-off' : 'whatsapp'} 
                size={60} 
                color="#fff" 
              />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.contactModalTitle}>
            {contactType === 'call' ? 'Namba ya Simu Haipatikani' : 'WhatsApp Haipatikani'}
          </Text>

          {/* Message */}
          <Text style={styles.contactModalMessage}>
            Samahani, {contactType === 'call' ? 'namba ya simu' : 'namba ya WhatsApp'} haijawekwa bado.
          </Text>

          <Text style={styles.contactModalSubMessage}>
            Tunafanya juu chini kukufikia, kwsasa hakuna mawasiliano.
          </Text>

          {/* Info Box */}
          <View style={styles.contactInfoBox}>
            <Icon name="information" size={24} color="#3b82f6" />
            <Text style={styles.contactInfoText}>
              Tafadhali jaribu tena baadaye au tumia njia nyingine ya mawasiliano.
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.contactCloseButton}
            onPress={closeContactModal}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.contactCloseGradient}
            >
              <Text style={styles.contactCloseText}>Sawa, Nimeelewa</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  </>
  );
};

// Main App Navigator with Stack for modals
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
          presentation: 'card',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="Player" 
          component={PlayerScreen}
          options={{
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Styles for Contact Modal
const styles = {
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contactModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  contactIconContainer: {
    marginBottom: 25,
  },
  contactIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  contactModalMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  contactModalSubMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  contactInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    gap: 15,
  },
  contactInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#3b82f6',
    lineHeight: 20,
  },
  contactCloseButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  contactCloseGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  contactCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
};

export default AppNavigator;
