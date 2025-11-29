import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import userService from '../services/userService';
import CustomModal from '../components/CustomModal';

const UsersScreen = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'blocked', 'expired'
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [grantAccessModal, setGrantAccessModal] = useState(false);
  const [timeInput, setTimeInput] = useState({ days: '0', hours: '0', minutes: '0' });
  
  // Custom modal states
  const [customModal, setCustomModal] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers(1, 100);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      
      // Check if it's a 503 error (backend not deployed)
      const is503 = error.response?.status === 503 || error.message?.includes('503');
      
      showCustomModal({
        type: is503 ? 'warning' : 'error',
        title: is503 ? '⚠️ Backend Not Deployed' : '❌ Connection Error',
        message: is503
          ? 'The backend service is not deployed yet.\n\n✅ AdminSupa is configured correctly\n⏳ Backend needs deployment\n\nDeploy at: dashboard.render.com\nService: supasoka-backend\n\nOnce deployed, pull down to refresh.'
          : 'Failed to load users. Please check your connection.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, []);

  const filterUsers = () => {
    let filtered = [...users];

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(u => u.isSubscribed && !u.isBlocked);
    } else if (filterStatus === 'blocked') {
      filtered = filtered.filter(u => u.isBlocked);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(u => !u.isSubscribed && !u.isBlocked);
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(u =>
        u.uniqueUserId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.deviceId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

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

  const openGrantAccessModal = (user) => {
    setSelectedUser(user);
    setTimeInput({ days: '0', hours: '0', minutes: '30' });
    setGrantAccessModal(true);
  };

  const handleGrantAccess = async () => {
    const days = parseInt(timeInput.days) || 0;
    const hours = parseInt(timeInput.hours) || 0;
    const minutes = parseInt(timeInput.minutes) || 0;

    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;

    if (totalMinutes <= 0) {
      showCustomModal({
        type: 'warning',
        title: 'Invalid Time',
        message: 'Please enter a valid time duration.',
      });
      return;
    }

    try {
      await userService.activateUser(selectedUser.uniqueUserId, {
        days,
        hours,
        minutes,
        accessLevel: 'premium',
      });

      setGrantAccessModal(false);
      await loadUsers();

      showCustomModal({
        type: 'success',
        title: 'Access Granted!',
        message: `Successfully granted ${days}d ${hours}h ${minutes}m to ${selectedUser.uniqueUserId}`,
      });
    } catch (error) {
      showCustomModal({
        type: 'error',
        title: 'Failed',
        message: error.response?.data?.error || 'Failed to grant access',
      });
    }
  };

  const handleBlockUser = (user) => {
    showCustomModal({
      type: 'warning',
      title: user.isBlocked ? 'Unblock User?' : 'Block User?',
      message: user.isBlocked
        ? `Are you sure you want to unblock ${user.uniqueUserId}?`
        : `Are you sure you want to block ${user.uniqueUserId}? They won't be able to access the app.`,
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        {
          text: user.isBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.toggleBlockUser(user.uniqueUserId, !user.isBlocked);
              await loadUsers();
              showCustomModal({
                type: 'success',
                title: 'Success',
                message: `User ${user.isBlocked ? 'unblocked' : 'blocked'} successfully!`,
              });
            } catch (error) {
              showCustomModal({
                type: 'error',
                title: 'Failed',
                message: 'Failed to update user status',
              });
            }
          },
          closeOnPress: false,
        },
      ],
    });
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes <= 0) return 'Expired';
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    return `${days}d ${hours}h ${mins}m`;
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userIconContainer}>
            <Ionicons name="person" size={24} color="#6366F1" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userId}>{item.uniqueUserId}</Text>
            <Text style={styles.deviceId} numberOfLines={1}>
              {item.deviceId}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          {item.isBlocked ? (
            <View style={[styles.statusBadge, styles.statusBlocked]}>
              <Text style={styles.statusText}>Blocked</Text>
            </View>
          ) : item.isSubscribed ? (
            <View style={[styles.statusBadge, styles.statusActive]}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusExpired]}>
              <Text style={styles.statusText}>Expired</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#94A3B8" />
          <Text style={styles.statText}>
            {formatTime(item.remainingTime)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
          <Text style={styles.statText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {item.accessLevel && (
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={[styles.statText, { color: '#10B981' }]}>
              {item.accessLevel}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openGrantAccessModal(item)}
        >
          <Ionicons name="time" size={18} color="#6366F1" />
          <Text style={styles.actionButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, item.isBlocked && styles.actionButtonUnblock]}
          onPress={() => handleBlockUser(item)}
        >
          <Ionicons
            name={item.isBlocked ? 'checkmark-circle' : 'ban'}
            size={18}
            color={item.isBlocked ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: item.isBlocked ? '#10B981' : '#EF4444' },
            ]}
          >
            {item.isBlocked ? 'Unblock' : 'Block'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users Management</Text>
        <Text style={styles.headerSubtitle}>
          {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by User ID or Device ID..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {['all', 'active', 'expired', 'blocked'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterBtn,
              filterStatus === status && styles.filterBtnActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterText,
                filterStatus === status && styles.filterTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
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
            <Ionicons name="people-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Grant Access Modal */}
      <Modal
        visible={grantAccessModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGrantAccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grant Access</Text>
              <TouchableOpacity onPress={() => setGrantAccessModal(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>User ID</Text>
              <Text style={styles.modalValue}>{selectedUser?.uniqueUserId}</Text>

              <Text style={styles.modalLabel}>Grant Access Time</Text>
              
              <View style={styles.timeInputContainer}>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeLabel}>Days</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={timeInput.days}
                    onChangeText={(text) =>
                      setTimeInput({ ...timeInput, days: text })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeLabel}>Hours</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={timeInput.hours}
                    onChangeText={(text) =>
                      setTimeInput({ ...timeInput, hours: text })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeLabel}>Minutes</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={timeInput.minutes}
                    onChangeText={(text) =>
                      setTimeInput({ ...timeInput, minutes: text })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  User will get premium access for the specified duration. Access will be automatically revoked when time expires.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setGrantAccessModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.grantBtn}
                onPress={handleGrantAccess}
              >
                <Text style={styles.grantBtnText}>Grant Access</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#F1F5F9',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#64748B',
  },
  statusContainer: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#10B98120',
  },
  statusExpired: {
    backgroundColor: '#F59E0B20',
  },
  statusBlocked: {
    backgroundColor: '#EF444420',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  actionButtonUnblock: {
    backgroundColor: '#10B98120',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
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
    height: '70%',
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
    flex: 1,
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 16,
  },
  modalValue: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  timeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#3B82F620',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
  grantBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  grantBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default UsersScreen;
