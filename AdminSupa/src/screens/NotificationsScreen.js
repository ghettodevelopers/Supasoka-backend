import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../services/notificationService';
import CustomModal from '../components/CustomModal';

const NOTIFICATION_TYPES = [
  { id: 'match_started', name: 'Match Started', icon: 'football', color: '#10B981' },
  { id: 'goal', name: 'Goal Scored', icon: 'trophy', color: '#F59E0B' },
  { id: 'movie', name: 'New Movie', icon: 'film', color: '#8B5CF6' },
  { id: 'general', name: 'General Update', icon: 'notifications', color: '#3B82F6' },
  { id: 'subscription', name: 'Subscription', icon: 'card', color: '#EF4444' },
  { id: 'maintenance', name: 'Maintenance', icon: 'construct', color: '#64748B' },
];

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    targetAll: true,
  });

  // Custom modal states
  const [customModal, setCustomModal] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getAllNotifications(1, 50);
      console.log('📬 Loaded notifications:', data.notifications?.length || 0);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
      showCustomModal({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to load notifications. Please check your connection.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const showCustomModal = ({ type, title, message, buttons = [] }) => {
    setCustomModal({
      visible: true,
      type,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: 'OK', style: 'primary' }],
    });
  };

  const hideCustomModal = () => {
    setCustomModal({ ...customModal, visible: false });
  };

  const openSendModal = () => {
    setFormData({
      title: '',
      message: '',
      type: 'general',
      targetAll: true,
    });
    setModalVisible(true);
  };

  const handleSendNotification = async () => {
    // Validation
    if (!formData.title.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Validation Error',
        message: 'Title is required',
      });
      return;
    }
    if (!formData.message.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Validation Error',
        message: 'Message is required',
      });
      return;
    }

    setSending(true);
    try {
      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        targetUsers: formData.targetAll ? null : [], // null = all users
      };

      const response = await notificationService.sendNotification(notificationData);
      console.log('✅ Notification sent successfully:', response);
      
      // Immediately add the new notification to the list (optimistic update)
      if (response && response.notification) {
        const newNotification = {
          ...response.notification,
          _count: {
            userNotifications: response.sentTo || 0
          },
          analytics: {
            totalSent: response.sentTo || 0,
            delivered: 0,
            read: 0,
            clicked: 0,
            deliveryRate: 0,
            readRate: 0,
            clickRate: 0
          }
        };
        
        console.log('📝 Adding notification to list:', newNotification.title);
        // Add to the beginning of the list
        setNotifications(prev => {
          console.log('📊 Previous notifications count:', prev.length);
          const updated = [newNotification, ...prev];
          console.log('📊 Updated notifications count:', updated.length);
          return updated;
        });
      } else {
        console.warn('⚠️ No notification object in response:', response);
      }
      
      showCustomModal({
        type: 'success',
        title: 'Notification Sent!',
        message: `Your notification has been sent to ${response.sentTo || 'all'} users!`,
      });

      setModalVisible(false);
      
      // Reload notifications in background to ensure sync
      setTimeout(() => {
        loadNotifications();
      }, 1000);
    } catch (error) {
      console.error('Send error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send notification';
      showCustomModal({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setSending(false);
    }
  };

  const getTypeConfig = (type) => {
    return NOTIFICATION_TYPES.find(t => t.id === type) || NOTIFICATION_TYPES[3];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => {
    const typeConfig = getTypeConfig(item.type);
    
    return (
      <View style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
          </View>
          <View style={styles.notificationInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
                <Text style={[styles.typeText, { color: typeConfig.color }]}>
                  {typeConfig.name}
                </Text>
              </View>
              {item._count?.userNotifications > 0 && (
                <View style={styles.recipientsBadge}>
                  <Ionicons name="people" size={12} color="#94A3B8" />
                  <Text style={styles.recipientsText}>
                    {item._count.userNotifications} users
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Send Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'} sent
          </Text>
        </View>
        <TouchableOpacity style={styles.sendButton} onPress={openSendModal}>
          <Ionicons name="send" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
        <Text style={styles.infoText}>
          ujumbe huu utapokelewa na watumiaji woe wa supasoka app mwaisa.
        </Text>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No notifications sent yet</Text>
            <Text style={styles.emptySubtext}>Tap the send button to create your first notification</Text>
          </View>
        }
      />

      {/* Send Notification Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Notification</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.label, { marginTop: 0 }]}>Notification Type *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.typeScroll}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeCard,
                      formData.type === type.id && styles.typeCardActive,
                      { borderColor: type.color },
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.id })}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                      <Ionicons name={type.icon} size={24} color={type.color} />
                    </View>
                    <Text
                      style={[
                        styles.typeName,
                        formData.type === type.id && styles.typeNameActive,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter notification title"
                placeholderTextColor="#64748B"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
              />

              <Text style={styles.label}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter notification message"
                placeholderTextColor="#64748B"
                value={formData.message}
                onChangeText={(text) =>
                  setFormData({ ...formData, message: text })
                }
                multiline
                numberOfLines={4}
              />

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={styles.previewNotification}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="logo-react" size={20} color="#6366F1" />
                    <Text style={styles.previewAppName}>Supasoka</Text>
                    <Text style={styles.previewTime}>now</Text>
                  </View>
                  <Text style={styles.previewTitle}>{formData.title || 'Notification Title'}</Text>
                  <Text style={styles.previewMessage}>{formData.message || 'Notification message will appear here...'}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  This notification will be sent to all users. They will receive it as a push notification and can view it in the app.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSendNotification}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.sendBtnText}>Send to All</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Modal */}
      <CustomModal
        visible={customModal.visible}
        onClose={hideCustomModal}
        type={customModal.type}
        title={customModal.title}
        message={customModal.message}
        buttons={customModal.buttons}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#3B82F620',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  notificationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notificationHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recipientsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipientsText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  modalBody: {
    maxHeight: '70%',
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
    marginTop: 12,
  },
  typeScroll: {
    marginBottom: 8,
  },
  typeCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#334155',
    marginRight: 12,
    minWidth: 100,
  },
  typeCardActive: {
    backgroundColor: '#1E293B',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeName: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  typeNameActive: {
    color: '#F1F5F9',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  previewBox: {
    marginTop: 20,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  previewNotification: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewAppName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 6,
    flex: 1,
  },
  previewTime: {
    fontSize: 11,
    color: '#64748B',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  previewMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#1E293B',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NotificationsScreen;
