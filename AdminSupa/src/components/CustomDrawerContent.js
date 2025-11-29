import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function CustomDrawerContent(props) {
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-dark-bg">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Header */}
        <View className="bg-primary-600 px-5 py-8 mb-4">
          <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
            <Ionicons name="person" size={32} color="white" />
          </View>
          <Text className="text-white text-lg font-bold">{admin?.name || 'Admin'}</Text>
          <Text className="text-white/80 text-sm">{admin?.email}</Text>
          <View className="mt-2 bg-white/20 px-3 py-1 rounded-full self-start">
            <Text className="text-white text-xs font-semibold uppercase">{admin?.role}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View className="border-t border-dark-border p-4">
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center bg-red-500/10 px-4 py-3 rounded-lg"
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text className="text-red-500 text-base font-semibold ml-3">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
