import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import CustomModal from '../components/CustomModal';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [liveChannels, setLiveChannels] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [freeChannels, setFreeChannels] = useState([]);

  // Custom modal states
  const [customModal, setCustomModal] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    // Delay to ensure token is fully set and login flag is still active
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.STATS);
      setStats(response.data.stats);
      setLiveChannels(response.data.liveChannels || []);
      setRecentActivity(response.data.recentActivity || []);
      
      // Load free channels
      const freeChannelsResponse = await api.get('/channels/free');
      setFreeChannels(freeChannelsResponse.data.channels || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      
      // Check if it's a 503 error (backend not deployed)
      const is503 = error.response?.status === 503 || error.message?.includes('503');
      
      showCustomModal({
        type: 'warning',
        title: is503 ? '⚠️ Backend Not Deployed' : '❌ Connection Error',
        message: is503 
          ? 'The backend service is not deployed yet.\n\n✅ AdminSupa is configured correctly\n⏳ Backend needs deployment on Render.com\n\n1. Go to dashboard.render.com\n2. Find "supasoka-backend"\n3. Click "Manual Deploy"\n4. Wait 2-5 minutes\n5. Refresh this screen'
          : 'Failed to load dashboard data. Please check your internet connection and try again.',
        buttons: [
          { text: 'OK', style: 'primary' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
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

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 1: // Free Channels
        navigation.navigate('Channels', { filterFree: true });
        break;
      case 2: // Manage Channels
        navigation.navigate('Channels');
        break;
      case 3: // View Analytics
        showCustomModal({
          type: 'info',
          title: 'Analytics Dashboard',
          message: `Total Views: ${formatNumber(stats?.totalViews || 0)}\nToday's Views: ${stats?.todayViews || 0}\nActive Users: ${stats?.activeUsers || 0}\nSubscription Rate: ${stats?.subscriptionRate || 0}%`,
        });
        break;
      case 4: // Send Alert
        navigation.navigate('Notifications');
        break;
    }
  };

  const handleStatPress = (statType) => {
    switch (statType) {
      case 'liveStreams':
        // Show live channels
        if (liveChannels.length > 0) {
          navigation.navigate('Channels');
        } else {
          showCustomModal({
            type: 'info',
            title: 'No Live Channels',
            message: 'There are no channels currently being watched.',
          });
        }
        break;
      case 'totalUsers':
        navigation.navigate('Users');
        break;
      case 'activeChannels':
        navigation.navigate('Channels');
        break;
      case 'totalViews':
        showCustomModal({
          type: 'info',
          title: 'View Statistics',
          message: `Total Views: ${formatNumber(stats?.totalViews || 0)}\nToday's Views: ${stats?.todayViews || 0}\n\nThis tracks all channel views from users.`,
        });
        break;
    }
  };

  const handleToggleFreeStatus = async (channelId) => {
    try {
      const response = await api.patch(`/channels/${channelId}/toggle-free`);
      
      // Update local free channels list
      setFreeChannels(prev => prev.filter(ch => ch.id !== channelId));
      
      showCustomModal({
        type: 'success',
        title: '✅ Success',
        message: `Channel is now ${response.data.channel.isFree ? 'FREE' : 'PREMIUM'}`,
      });
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to toggle free status:', error);
      showCustomModal({
        type: 'error',
        title: '❌ Error',
        message: 'Failed to update channel status. Please try again.',
      });
    }
  };

  const quickActions = [
    { id: 1, title: 'Free Channels', icon: 'gift', color: '#10B981' },
    { id: 2, title: 'Manage Channels', icon: 'tv', color: '#4ECDC4' },
    { id: 3, title: 'View Analytics', icon: 'stats-chart', color: '#A78BFA' },
    { id: 4, title: 'Send Alert', icon: 'notifications', color: '#FCD34D' },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome Back Bro! 👋</Text>
          <Text style={styles.subGreeting}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color="#F1F5F9" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => handleStatPress('liveStreams')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B20' }]}>
              <Ionicons name="videocam" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.statValue}>{stats?.liveChannelsCount || 0}</Text>
            <Text style={styles.statTitle}>Live Channels</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => handleStatPress('totalUsers')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#4ECDC420' }]}>
              <Ionicons name="people" size={24} color="#4ECDC4" />
            </View>
            <Text style={styles.statValue}>{formatNumber(stats?.totalUsers || 0)}</Text>
            <Text style={styles.statTitle}>Total Users</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => handleStatPress('activeChannels')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#A78BFA20' }]}>
              <Ionicons name="tv" size={24} color="#A78BFA" />
            </View>
            <Text style={styles.statValue}>{stats?.activeChannels || 0}</Text>
            <Text style={styles.statTitle}>Active Channels</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => handleStatPress('totalViews')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FCD34D20' }]}>
              <Ionicons name="eye" size={24} color="#FCD34D" />
            </View>
            <Text style={styles.statValue}>{formatNumber(stats?.totalViews || 0)}</Text>
            <Text style={styles.statTitle}>Total Views</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity 
                key={action.id} 
                style={styles.actionCard}
                activeOpacity={0.7}
                onPress={() => handleQuickAction(action.id)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Free Channels Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎁 Free Channels</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Channels', { filterFree: true })}>
              <Text style={styles.seeAll}>Manage All</Text>
            </TouchableOpacity>
          </View>
          
          {freeChannels.length > 0 ? (
            freeChannels.slice(0, 3).map((channel) => (
              <View 
                key={channel.id} 
                style={styles.freeChannelCard}
              >
                {channel.logo ? (
                  <Image source={{ uri: channel.logo }} style={styles.freeChannelThumbnail} />
                ) : (
                  <View style={[styles.freeChannelThumbnail, styles.freeChannelThumbnailPlaceholder]}>
                    <MaterialCommunityIcons name="television" size={28} color="#10B981" />
                  </View>
                )}
                <View style={styles.freeChannelInfo}>
                  <View style={styles.freeChannelHeader}>
                    <Text style={styles.freeChannelTitle}>{channel.name}</Text>
                    <View style={styles.freeBadge}>
                      <Ionicons name="gift" size={12} color="#10B981" />
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  </View>
                  <View style={styles.freeChannelMeta}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{channel.category}</Text>
                    </View>
                    {channel.isActive && (
                      <View style={styles.activeIndicator}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.freeChannelActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('Channels', { editChannel: channel.id })}
                    >
                      <Ionicons name="create-outline" size={16} color="#6366F1" />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => handleToggleFreeStatus(channel.id)}
                    >
                      <Ionicons name="lock-closed-outline" size={16} color="#F59E0B" />
                      <Text style={styles.actionBtnText}>Make Premium</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>No free channels available</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('Channels', { openFreeChannelModal: true })}
              >
                <Text style={styles.addButtonText}>Add Free Channel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Live Channels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Now</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Channels')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {liveChannels.length > 0 ? (
            liveChannels.slice(0, 5).map((channel) => (
              <TouchableOpacity 
                key={channel.id} 
                style={styles.streamCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Channels')}
              >
                {channel.logo ? (
                  <Image source={{ uri: channel.logo }} style={styles.streamThumbnail} />
                ) : (
                  <View style={[styles.streamThumbnail, styles.streamThumbnailPlaceholder]}>
                    <MaterialCommunityIcons name="television" size={32} color="#64748B" />
                  </View>
                )}
                <View style={styles.streamInfo}>
                  <Text style={styles.streamTitle}>{channel.name}</Text>
                  <View style={styles.streamMeta}>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    <View style={styles.viewerCount}>
                      <Ionicons name="eye" size={14} color="#94A3B8" />
                      <Text style={styles.viewerText}>{channel.viewers}</Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{channel.category}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-off-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>No channels currently being watched</Text>
            </View>
          )}
        </View>

        {/* Activity Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <Ionicons name="arrow-up" size={20} color="#10B981" />
                <Text style={styles.activityLabel}>New Users</Text>
                <Text style={styles.activityValue}>+{stats?.todayNewUsers || 0}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.activityItem}>
                <Ionicons name="eye" size={20} color="#3B82F6" />
                <Text style={styles.activityLabel}>Today's Views</Text>
                <Text style={styles.activityValue}>{stats?.todayViews || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Overview</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <Ionicons name="people" size={20} color="#10B981" />
                <Text style={styles.activityLabel}>Subscribed</Text>
                <Text style={styles.activityValue}>{stats?.subscribedUsers || 0}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.activityItem}>
                <Ionicons name="trending-up" size={20} color="#F59E0B" />
                <Text style={styles.activityLabel}>Rate</Text>
                <Text style={styles.activityValue}>{stats?.subscriptionRate || 0}%</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  subGreeting: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  streamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 1,
  },
  streamThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  streamThumbnailPlaceholder: {
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamInfo: {
    flex: 1,
  },
  streamTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  activityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityItem: {
    alignItems: 'center',
    flex: 1,
  },
  activityLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 4,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  divider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 16,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  freeChannelCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  freeChannelThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  freeChannelThumbnailPlaceholder: {
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeChannelInfo: {
    flex: 1,
  },
  freeChannelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  freeChannelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 8,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  freeChannelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  freeChannelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
});

export default DashboardScreen;
