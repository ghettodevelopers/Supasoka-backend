import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import carouselService from '../services/carouselService';
import CustomModal from '../components/CustomModal';

const { width } = Dimensions.get('window');

const CarouselsScreen = () => {
  const [carousels, setCarousels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    description: '',
    linkUrl: '',
    order: 0,
    isActive: true,
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
    loadCarousels();
  }, []);

  const loadCarousels = async () => {
    try {
      setLoading(true);
      const data = await carouselService.getAllCarousels();
      setCarousels(data);
    } catch (error) {
      console.error('Failed to load carousels:', error);
      
      // Check if it's a 503 error (backend not deployed)
      const is503 = error.message?.includes('503') || error.response?.status === 503;
      
      showCustomModal({
        type: is503 ? 'warning' : 'error',
        title: is503 ? '⚠️ Backend Not Deployed' : '❌ Connection Error',
        message: is503
          ? 'The backend service is not deployed yet.\n\n✅ AdminSupa is configured correctly\n⏳ Backend needs deployment\n\nDeploy at: dashboard.render.com\nService: supasoka-backend\n\nOnce deployed, click Retry.'
          : error.message || 'Failed to load carousel images. Please check your connection.',
        buttons: [
          { text: 'Cancel', style: 'secondary' },
          {
            text: 'Retry',
            style: 'primary',
            onPress: async () => {
              hideCustomModal();
              await loadCarousels();
            },
            closeOnPress: false,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCarousels();
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

  const openAddModal = () => {
    setEditingCarousel(null);
    setFormData({
      imageUrl: '',
      title: '',
      description: '',
      linkUrl: '',
      order: carousels.length,
      isActive: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (carousel) => {
    setEditingCarousel(carousel);
    setFormData({
      imageUrl: carousel.imageUrl || carousel.image || '',
      title: carousel.title || '',
      description: carousel.description || carousel.subtitle || '',
      linkUrl: carousel.linkUrl || carousel.actionUrl || '',
      order: carousel.order || 0,
      isActive: carousel.isActive !== undefined ? carousel.isActive : true,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.imageUrl.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Validation Error',
        message: 'Image URL is required',
      });
      return;
    }
    if (!formData.imageUrl.includes('http')) {
      showCustomModal({
        type: 'warning',
        title: 'Validation Error',
        message: 'Image URL must be a valid URL (http/https)',
      });
      return;
    }

    setSaving(true);
    try {
      const carouselData = {
        imageUrl: formData.imageUrl.trim(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        linkUrl: formData.linkUrl.trim(),
        order: parseInt(formData.order) || 0,
        isActive: formData.isActive,
      };

      if (editingCarousel) {
        await carouselService.updateCarousel(editingCarousel.id, carouselData);
        showCustomModal({
          type: 'success',
          title: 'Success!',
          message: 'Carousel image updated successfully!',
        });
      } else {
        await carouselService.createCarousel(carouselData);
        showCustomModal({
          type: 'success',
          title: 'Success!',
          message: 'Carousel image created successfully!',
        });
      }

      setModalVisible(false);
      await loadCarousels();
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error.message || error.response?.data?.error || 'Failed to save carousel';
      showCustomModal({
        type: 'error',
        title: 'Save Failed',
        message: errorMessage,
        buttons: [
          { text: 'OK', style: 'primary' },
        ],
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (carousel) => {
    showCustomModal({
      type: 'warning',
      title: 'Delete Carousel Image?',
      message: `Are you sure you want to delete "${carousel.title || 'this image'}"?\n\nThis action cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await carouselService.deleteCarousel(carousel.id);
              await loadCarousels();
              showCustomModal({
                type: 'success',
                title: 'Deleted!',
                message: 'Carousel image deleted successfully!',
              });
            } catch (error) {
              console.error('Delete error:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Failed to delete carousel';
              showCustomModal({
                type: 'error',
                title: 'Error',
                message: errorMessage,
              });
            }
          },
          closeOnPress: false,
        },
      ],
    });
  };

  const renderCarouselItem = ({ item, index }) => (
    <View style={styles.carouselCard}>
      <View style={styles.carouselImageContainer}>
        <Image
          source={{ uri: item.imageUrl || item.image }}
          style={styles.carouselImage}
          resizeMode="cover"
        />
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>#{item.order || index + 1}</Text>
        </View>
        {!item.isActive && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
      </View>

      <View style={styles.carouselInfo}>
        <Text style={styles.carouselTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        {item.description && (
          <Text style={styles.carouselDescription} numberOfLines={2}>
            {item.description || item.subtitle}
          </Text>
        )}
        {item.linkUrl && (
          <View style={styles.linkContainer}>
            <Ionicons name="link" size={14} color="#6366F1" />
            <Text style={styles.linkText} numberOfLines={1}>
              {item.linkUrl || item.actionUrl}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.carouselActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#6366F1" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading carousels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Carousel Images</Text>
          <Text style={styles.headerSubtitle}>
            {carousels.length} {carousels.length === 1 ? 'image' : 'images'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
        <Text style={styles.infoText}>
          Carousel images are displayed at the top of the user app. They auto-rotate every few seconds.
        </Text>
      </View>

      {/* Carousels List */}
      <FlatList
        data={carousels}
        renderItem={renderCarouselItem}
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
            <Ionicons name="images-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No carousel images</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first image</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCarousel ? 'Edit Carousel' : 'Add Carousel'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.label, { marginTop: 0 }]}>Image URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor="#64748B"
                value={formData.imageUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, imageUrl: text })
                }
              />

              {formData.imageUrl && formData.imageUrl.includes('http') && (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: formData.imageUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter title"
                placeholderTextColor="#64748B"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
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

              <Text style={styles.label}>Link URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor="#64748B"
                value={formData.linkUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, linkUrl: text })
                }
              />

              <Text style={styles.label}>Display Order</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#64748B"
                value={formData.order.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    order: parseInt(text) || 0,
                  })
                }
                keyboardType="numeric"
              />

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
                    {editingCarousel ? 'Update' : 'Create'}
                  </Text>
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
  addButton: {
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
  carouselCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  carouselImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  orderBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inactiveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  carouselInfo: {
    padding: 16,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  carouselDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkText: {
    fontSize: 12,
    color: '#6366F1',
    flex: 1,
  },
  carouselActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  deleteBtn: {
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  deleteBtnText: {
    color: '#EF4444',
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
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
});

export default CarouselsScreen;
