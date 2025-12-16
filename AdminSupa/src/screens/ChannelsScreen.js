import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import channelService from '../services/channelService';

const DEFAULT_CATEGORIES = [
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'documentary', name: 'Documentary', icon: '🎥' },
  { id: 'kids', name: 'Kids', icon: '👶' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🏡' },
  { id: 'religious', name: 'Religious', icon: '🕌' },
];

const ChannelsScreen = ({ route }) => {
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [freeChannelModalVisible, setFreeChannelModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    logo: '',
    streamUrl: '',
    description: '',
    color: ['#6366F1', '#8B5CF6'],
    hd: true,
    isActive: true,
    priority: 0,
    drmConfig: null,
    hasDRM: false,
    clearKey: '',
    isFree: false,
  });

  useEffect(() => {
    loadChannels();
    loadCategories();
    
    // Check if we should open free channel modal from navigation
    if (route?.params?.openFreeChannelModal) {
      setTimeout(() => openFreeChannelModal(), 500);
    }
  }, []);

  useEffect(() => {
    filterChannels();
  }, [channels, selectedCategory, searchQuery]);

  const loadCategories = async () => {
    try {
      const data = await channelService.getCategories();
      if (data && data.length > 0) {
        setCategories(data);
      }
      // Keep default categories if API returns empty or fails
    } catch (error) {
      console.error('Error loading categories:', error);
      // Keep default categories
    }
  };

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await channelService.getAllChannels('all', 'all');
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels:', error);
      
      // Check if it's a 503 error (backend not deployed)
      const is503 = error.response?.status === 503 || error.message?.includes('503');
      
      Alert.alert(
        is503 ? '⚠️ Backend Not Deployed' : '❌ Connection Error',
        is503
          ? 'The backend service is not deployed yet.\n\n✅ AdminSupa is configured correctly\n⏳ Backend needs deployment\n\nDeploy at: dashboard.render.com\nService: supasoka-backend\n\nOnce deployed, pull down to refresh.'
          : 'Cannot connect to backend server.\n\nPlease check:\n1. Internet connection\n2. Backend is deployed on Render.com\n3. Try refreshing',
        [{ text: 'OK' }]
      );
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChannels();
    setRefreshing(false);
  }, []);

  const filterChannels = () => {
    let filtered = channels;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((ch) => ch.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((ch) =>
        ch.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredChannels(filtered);
  };

  const openAddModal = () => {
    console.log('Opening add modal');
    console.log('Categories available:', categories.length);
    console.log('Categories:', categories);
    setEditingChannel(null);
    setFormData({
      name: '',
      category: categories[0]?.name || 'News',
      logo: '',
      streamUrl: '',
      description: '',
      color: ['#6366F1', '#8B5CF6'],
      hd: true,
      isActive: true,
      priority: 0,
      drmConfig: null,
      hasDRM: false,
      clearKey: '',
      isFree: false,
    });
    console.log('Modal visible set to true');
    setModalVisible(true);
  };

  const openFreeChannelModal = () => {
    setEditingChannel(null);
    setFormData({
      name: '',
      category: categories[0]?.name || 'News',
      logo: '',
      streamUrl: '',
      description: '',
      color: ['#10B981', '#059669'],
      hd: true,
      isActive: true,
      priority: 0,
      drmConfig: null,
      hasDRM: false,
      clearKey: '',
      isFree: true,
    });
    setFreeChannelModalVisible(true);
  };

  const openEditModal = (channel) => {
    setEditingChannel(channel);
    // Parse drmConfig if it's a string
    let parsedDrmConfig = channel.drmConfig;
    if (typeof channel.drmConfig === 'string') {
      try {
        parsedDrmConfig = JSON.parse(channel.drmConfig);
      } catch (e) {
        console.log('Failed to parse drmConfig, setting to null');
        parsedDrmConfig = null;
      }
    }
    
    // Check if DRM is enabled: drmConfig exists and has clearKey
    const hasDRM = !!(parsedDrmConfig && parsedDrmConfig.clearKey);
    const clearKey = hasDRM ? parsedDrmConfig.clearKey : '';
    
    console.log('📝 Opening edit modal for channel:', {
      name: channel.name,
      hasDRM,
      clearKey: clearKey ? '***' + clearKey.slice(-4) : 'none',
      drmConfig: parsedDrmConfig
    });
    
    setFormData({
      name: channel.name,
      category: channel.category,
      logo: channel.logo || '',
      streamUrl: channel.streamUrl,
      description: channel.description || '',
      color: channel.color || ['#6366F1', '#8B5CF6'],
      hd: channel.hd,
      isActive: channel.isActive,
      priority: channel.priority || 0,
      drmConfig: parsedDrmConfig,
      hasDRM: hasDRM,
      clearKey: clearKey,
      isFree: channel.isFree || false,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Channel name is required');
      return;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (!formData.streamUrl.trim()) {
      Alert.alert('Validation Error', 'Stream URL is required');
      return;
    }
    if (!formData.streamUrl.includes('http')) {
      Alert.alert('Validation Error', 'Stream URL must be a valid URL (http/https)');
      return;
    }
    if (formData.hasDRM && !formData.clearKey.trim()) {
      Alert.alert('Validation Error', 'ClearKey is required when DRM is enabled');
      return;
    }

    setSaving(true);
    try {
      // Build channel data with proper DRM handling
      const channelData = {
        name: formData.name.trim(),
        category: formData.category,
        logo: formData.logo.trim() || null,
        streamUrl: formData.streamUrl.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        hd: formData.hd,
        isActive: formData.isActive,
        priority: parseInt(formData.priority) || 0,
        isFree: formData.isFree,
        drmEnabled: formData.hasDRM,
      };

      // Handle DRM config properly based on toggle state
      if (formData.hasDRM && formData.clearKey.trim()) {
        // DRM is ON and clearKey is provided - save it
        channelData.drmConfig = {
          clearKey: formData.clearKey.trim()
        };
      } else {
        // DRM is OFF or no clearKey - explicitly set to null
        channelData.drmConfig = null;
      }

      console.log('💾 Saving channel with DRM config:', {
        hasDRM: formData.hasDRM,
        drmConfig: channelData.drmConfig,
        channelName: channelData.name
      });

      let result;
      if (editingChannel) {
        result = await channelService.updateChannel(editingChannel.id, channelData);
      } else {
        result = await channelService.createChannel(channelData);
      }

      // Only show success if result is valid
      if (result && result.id) {
        Alert.alert('✅ Success', formData.isFree ? 'Free channel created successfully!' : (editingChannel ? 'Channel updated successfully!' : 'Channel created successfully!'));
        setModalVisible(false);
        setFreeChannelModalVisible(false);
        await loadChannels();
      } else {
        throw new Error('No channel returned from server');
      }
    } catch (error) {
      console.error('Save error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      let errorMessage = 'Failed to save channel';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors) {
        // Validation errors
        errorMessage = error.response.data.errors.map(e => e.msg).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('❌ Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (channel) => {
    Alert.alert(
      '🗑️ Delete Channel',
      `Are you sure you want to delete "${channel.name}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await channelService.deleteChannel(channel.id);
              Alert.alert('✅ Success', 'Channel deleted successfully!');
              await loadChannels();
            } catch (error) {
              console.error('Delete error:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Failed to delete channel';
              Alert.alert('❌ Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (channel) => {
    try {
      await channelService.toggleChannelStatus(channel.id);
      await loadChannels();
    } catch (error) {
      console.error('Toggle error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to toggle channel status';
      Alert.alert('❌ Error', errorMessage);
    }
  };

  const renderChannelItem = ({ item }) => (
    <View style={styles.channelCard}>
      <View style={styles.channelHeader}>
        <View style={styles.channelInfo}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.channelLogo} />
          ) : (
            <View style={styles.channelLogoPlaceholder}>
              <Ionicons name="tv" size={24} color="#64748B" />
            </View>
          )}
          <View style={styles.channelDetails}>
            <Text style={styles.channelName}>{item.name}</Text>
            <Text style={styles.channelCategory}>{item.category}</Text>
            {item.isFree && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
            {item.drmConfig && (
              <View style={styles.drmBadge}>
                <Ionicons name="lock-closed" size={12} color="#F59E0B" />
                <Text style={styles.drmText}>DRM</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.channelActions}>
          <TouchableOpacity
            style={[
              styles.statusBtn,
              item.isActive ? styles.activeBtn : styles.inactiveBtn,
            ]}
            onPress={() => handleToggleStatus(item)}
          >
            <Text
              style={[
                styles.statusText,
                item.isActive ? styles.activeText : styles.inactiveText,
              ]}
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.channelFooter}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#6366F1" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Channels</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search channels..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryBtn,
            selectedCategory === 'all' && styles.categoryBtnActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'all' && styles.categoryTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id || cat.name}
            style={[
              styles.categoryBtn,
              selectedCategory === cat.name && styles.categoryBtnActive,
            ]}
            onPress={() => setSelectedCategory(cat.name)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.name && styles.categoryTextActive,
              ]}
            >
              {cat.icon} {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Channels List */}
      <FlatList
        data={filteredChannels}
        renderItem={renderChannelItem}
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
            <Ionicons name="tv-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No channels found</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingChannel ? 'Edit Channel' : 'Add Channel'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={[styles.label, { marginTop: 0 }]}>Channel Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter channel name"
                placeholderTextColor="#64748B"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />

              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryPicker}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id || cat.name}
                    style={[
                      styles.categoryOption,
                      formData.category === cat.name &&
                        styles.categoryOptionActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category: cat.name })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        formData.category === cat.name &&
                          styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.icon} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Logo URL</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter logo URL"
                placeholderTextColor="#64748B"
                value={formData.logo}
                onChangeText={(text) =>
                  setFormData({ ...formData, logo: text })
                }
              />

              <Text style={styles.label}>Stream URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter stream URL (m3u8)"
                placeholderTextColor="#64748B"
                value={formData.streamUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, streamUrl: text })
                }
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor="#64748B"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={3}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>DRM Protected</Text>
                <Switch
                  value={formData.hasDRM}
                  onValueChange={(value) => {
                    // When turning OFF DRM, clear the clearKey
                    if (!value) {
                      setFormData({ ...formData, hasDRM: value, clearKey: '' });
                    } else {
                      setFormData({ ...formData, hasDRM: value });
                    }
                  }}
                  trackColor={{ false: '#334155', true: '#6366F1' }}
                  thumbColor={formData.hasDRM ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              {formData.hasDRM && (
                <>
                  <Text style={styles.label}>ClearKey *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter DRM ClearKey (required when DRM is ON)"
                    placeholderTextColor="#64748B"
                    value={formData.clearKey}
                    onChangeText={(text) =>
                      setFormData({ ...formData, clearKey: text })
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.helperText}>
                    💡 Enter the ClearKey for DRM-protected content. Leave empty and toggle OFF to disable DRM.
                  </Text>
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.label}>HD Quality</Text>
                <Switch
                  value={formData.hd}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hd: value })
                  }
                  trackColor={{ false: '#334155', true: '#6366F1' }}
                  thumbColor={formData.hd ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: value })
                  }
                  trackColor={{ false: '#334155', true: '#10B981' }}
                  thumbColor={formData.isActive ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Free Channel (No Payment)</Text>
                <Switch
                  value={formData.isFree}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isFree: value })
                  }
                  trackColor={{ false: '#334155', true: '#22c55e' }}
                  thumbColor={formData.isFree ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              <Text style={styles.label}>Priority (for ordering)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#64748B"
                value={formData.priority.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(text) || 0,
                  })
                }
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingChannel ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Free Channel Modal */}
      <Modal
        visible={freeChannelModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFreeChannelModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFreeChannelModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
            <View style={styles.modalHeader}>
              <View style={styles.freeChannelHeader}>
                <Ionicons name="gift" size={24} color="#10B981" />
                <Text style={styles.modalTitle}>Add Free Channel</Text>
              </View>
              <TouchableOpacity onPress={() => setFreeChannelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.freeChannelBanner}>
                <Ionicons name="information-circle" size={20} color="#10B981" />
                <Text style={styles.freeChannelBannerText}>
                  Free channels are accessible to all users without subscription
                </Text>
              </View>

              <Text style={[styles.label, { marginTop: 0 }]}>Channel Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter channel name"
                placeholderTextColor="#64748B"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />

              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryPicker}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id || cat.name}
                    style={[
                      styles.categoryOption,
                      formData.category === cat.name &&
                        styles.categoryOptionActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category: cat.name })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        formData.category === cat.name &&
                          styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.icon} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Logo URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/logo.png"
                placeholderTextColor="#64748B"
                value={formData.logo}
                onChangeText={(text) =>
                  setFormData({ ...formData, logo: text })
                }
              />

              <Text style={styles.label}>Stream URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://stream.example.com/channel.m3u8"
                placeholderTextColor="#64748B"
                value={formData.streamUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, streamUrl: text })
                }
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Channel description..."
                placeholderTextColor="#64748B"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={3}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>HD Quality</Text>
                <Switch
                  value={formData.hd}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hd: value })
                  }
                  trackColor={{ false: '#334155', true: '#10B981' }}
                  thumbColor={formData.hd ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: value })
                  }
                  trackColor={{ false: '#334155', true: '#10B981' }}
                  thumbColor={formData.isActive ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              <Text style={styles.label}>Priority (for ordering)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#64748B"
                value={formData.priority.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(text) || 0,
                  })
                }
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setFreeChannelModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.freeChannelSaveBtn, saving && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="gift" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Create Free Channel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#F1F5F9',
  },
  categoryScroll: {
    marginTop: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  categoryBtnActive: {
    backgroundColor: '#6366F1',
  },
  categoryText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  channelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  channelLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelDetails: {
    marginLeft: 12,
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  channelCategory: {
    fontSize: 14,
    color: '#94A3B8',
  },
  drmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  drmText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 4,
  },
  channelActions: {
    marginLeft: 12,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeBtn: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBtn: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#10B981',
  },
  inactiveText: {
    color: '#EF4444',
  },
  channelFooter: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
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
    height: 80,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryOptionActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  freeChannelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeChannelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  freeChannelBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#10B981',
    lineHeight: 18,
  },
  freeChannelSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default ChannelsScreen;
