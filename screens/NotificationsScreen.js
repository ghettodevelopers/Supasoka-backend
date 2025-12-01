import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationsScreen = ({ navigation }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'channel_update':
        return { name: 'television', color: '#3b82f6' };
      case 'carousel_update':
        return { name: 'image-multiple', color: '#8b5cf6' };
      case 'admin_message':
        return { name: 'message-alert', color: '#f59e0b' };
      case 'access_granted':
        return { name: 'check-circle', color: '#10b981' };
      default:
        return { name: 'bell', color: '#6b7280' };
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Sasa hivi';
    if (diffInMins < 60) return `Dakika ${diffInMins} zilizopita`;
    if (diffInHours < 24) return `Saa ${diffInHours} zilizopita`;
    if (diffInDays < 7) return `Siku ${diffInDays} zilizopita`;
    
    return date.toLocaleDateString('sw-TZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const renderNotification = (notification) => {
    const icon = getNotificationIcon(notification.type);

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationCard,
          !notification.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Icon name={icon.name} size={24} color={icon.color} />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          
          <Text style={styles.notificationTime}>
            {formatTimestamp(notification.timestamp)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Arifa</Text>
        
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
            >
              <Icon name="check-all" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearNotifications}
            >
              <Icon name="delete-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="bell-off-outline" size={80} color="#4b5563" />
            <Text style={styles.emptyStateTitle}>Hakuna Arifa</Text>
            <Text style={styles.emptyStateText}>
              Arifa zote kutoka kwa msimamizi zitaonekana hapa
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  markAllButton: {
    padding: 4,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  notificationsList: {
    padding: 15,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  unreadNotification: {
    backgroundColor: '#1e293b',
    borderColor: '#3b82f6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NotificationsScreen;
