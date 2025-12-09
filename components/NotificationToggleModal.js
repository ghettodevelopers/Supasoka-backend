import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const NotificationToggleModal = ({ visible, onClose, onEnable, onDisable, isEnabled }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.modalContent}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={isEnabled ? ['#10b981', '#059669'] : ['#3b82f6', '#2563eb']}
                style={styles.iconGradient}
              >
                <Icon 
                  name={isEnabled ? "bell-off" : "bell-ring"} 
                  size={48} 
                  color="#fff" 
                />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isEnabled ? 'Zima Taarifa?' : 'Ujumbe Umewashwa'}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {isEnabled ? (
                'Je, una uhakika unataka kuzima taarifa? Hutapata habari za vituo vipya na ofa maalum.'
              ) : (
                'Tunashauri kuacha kipengele hiki wazi ili uweze kupata taarifa muhimu na ofa kila siku kutoka Supasoka.'
              )}
            </Text>

            {/* Benefits (only show when enabling) */}
            {!isEnabled && (
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.benefitText}>Habari za vituo vipya</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.benefitText}>Ofa maalum za malipo</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.benefitText}>Mechi na matukio muhimu</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.benefitText}>Maudhui mapya kila siku</Text>
                </View>
              </View>
            )}

            {/* Warning (only show when disabling) */}
            {isEnabled && (
              <View style={styles.warningBox}>
                <Icon name="alert-circle" size={24} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Lakini kama haupo tayari unaweza kuzima hapo chini
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {isEnabled ? (
                <>
                  {/* Keep Enabled Button */}
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.primaryButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Icon name="check" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>Sawa, Acha Wazi</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Disable Button */}
                  <TouchableOpacity
                    style={styles.disableButton}
                    onPress={onDisable}
                    activeOpacity={0.8}
                  >
                    <Icon name="bell-off" size={18} color="#ef4444" />
                    <Text style={styles.disableButtonText}>Zima</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Enable Button */}
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onEnable}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      style={styles.primaryButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Icon name="bell-ring" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>Sawa, Washa</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Close Button */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeButtonText}>Baadaye</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#e2e8f0',
    marginLeft: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    fontSize: 14,
    color: '#fbbf24',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disableButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  disableButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationToggleModal;
