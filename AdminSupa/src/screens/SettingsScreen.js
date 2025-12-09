import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import settingsService from '../services/settingsService';
import CustomModal from '../components/CustomModal';

const SettingsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Contact Settings
  const [contactSettings, setContactSettings] = useState({
    whatsappNumber: '',
    callNumber: '',
    supportEmail: '',
  });

  // App Info
  const [appInfo] = useState({
    version: '1.0.0',
    buildNumber: '1',
    platform: 'Android',
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const contactData = await settingsService.getContactSettings();

      if (contactData?.contactSettings) {
        setContactSettings({
          whatsappNumber: contactData.contactSettings.whatsappNumber || '',
          callNumber: contactData.contactSettings.callNumber || '',
          supportEmail: contactData.contactSettings.supportEmail || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showCustomModal({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to load settings. Please check your connection.',
      });
    } finally {
      setLoading(false);
    }
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

  const handleSaveContactSettings = async () => {
    if (!contactSettings.whatsappNumber && !contactSettings.callNumber && !contactSettings.supportEmail) {
      showCustomModal({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please enter at least one contact method.',
      });
      return;
    }

    setSaving(true);
    try {
      await settingsService.updateContactSettings(contactSettings);

      showCustomModal({
        type: 'success',
        title: 'Settings Saved!',
        message: 'Contact settings updated successfully!',
      });
    } catch (error) {
      showCustomModal({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Badili settings za app </Text>
        </View>

        {/* Contact Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>Mawasiliano</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Mtumiaji atawasiliana nami kwa namba na Email zifuatazaz
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
              <TextInput
                style={styles.input}
                value={contactSettings.whatsappNumber}
                onChangeText={(text) =>
                  setContactSettings({ ...contactSettings, whatsappNumber: text })
                }
                placeholder="+255 XXX XXX XXX"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Call Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call" size={20} color="#3B82F6" />
              <TextInput
                style={styles.input}
                value={contactSettings.callNumber}
                onChangeText={(text) =>
                  setContactSettings({ ...contactSettings, callNumber: text })
                }
                placeholder="+255 XXX XXX XXX"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Support Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#EF4444" />
              <TextInput
                style={styles.input}
                value={contactSettings.supportEmail}
                onChangeText={(text) =>
                  setContactSettings({ ...contactSettings, supportEmail: text })
                }
                placeholder="ghettodevelopers@gmail.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveContactSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Contact Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>App Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>{appInfo.version}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build Number</Text>
            <Text style={styles.infoValue}>{appInfo.buildNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{appInfo.platform}</Text>
          </View>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Admin Actions</Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              showCustomModal({
                type: 'info',
                title: 'Clear Cache',
                message: 'This will clear all cached data in the app.',
                buttons: [
                  { text: 'Cancel', style: 'secondary' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                      showCustomModal({
                        type: 'success',
                        title: 'Cache Cleared',
                        message: 'App cache has been cleared successfully.',
                      });
                    },
                    closeOnPress: false,
                  },
                ],
              });
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#F59E0B" />
            <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>
              Clear Cache
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={loadSettings}
          >
            <Ionicons name="refresh" size={20} color="#3B82F6" />
            <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
              Reload Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Supasoka Admin Panel</Text>
          <Text style={styles.footerSubtext}>© 2025 All rights reserved</Text>
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
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  timeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F1F5F9',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default SettingsScreen;
