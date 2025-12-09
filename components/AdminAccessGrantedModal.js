import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

const AdminAccessGrantedModal = ({ visible, onClose, timeGranted, accessLevel }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal entrance
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
        Animated.loop(
          Animated.sequence([
            Animated.timing(confettiAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(confettiAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  const formatTime = (minutes) => {
    if (minutes >= 43200) { // 30 days
      const months = Math.floor(minutes / 43200);
      return `${months} ${months === 1 ? 'mwezi' : 'miezi'}`;
    } else if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} ${days === 1 ? 'siku' : 'siku'}`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${hours === 1 ? 'saa' : 'masaa'}`;
    } else {
      return `${minutes} ${minutes === 1 ? 'dakika' : 'dakika'}`;
    }
  };

  const getAccessLevelText = (level) => {
    switch (level) {
      case 'premium':
        return 'Premium';
      case 'vip':
        return 'VIP';
      case 'trial':
        return 'Jaribio';
      default:
        return 'Maalum';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#4c1d95', '#7c3aed', '#a78bfa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Confetti Effect */}
            <Animated.View
              style={[
                styles.confettiContainer,
                {
                  opacity: confettiAnim,
                  transform: [
                    {
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 300],
                      }),
                    },
                  ],
                },
              ]}
            >
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.confetti,
                    {
                      left: `${(i * 5) % 100}%`,
                      backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'][i % 5],
                    },
                  ]}
                />
              ))}
            </Animated.View>

            {/* Gift Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                style={styles.iconGradient}
              >
                <Icon name="gift" size={60} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>🎉 Hongera! 🎉</Text>
            <Text style={styles.subtitle}>Umezawadiwa</Text>

            {/* Time Display */}
            <View style={styles.timeContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.timeBox}
              >
                <Text style={styles.timeLabel}>Muda Ulioidhinishwa</Text>
                <Text style={styles.timeValue}>{formatTime(timeGranted)}</Text>
                <View style={styles.accessBadge}>
                  <Text style={styles.accessBadgeText}>
                    {getAccessLevelText(accessLevel)}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                Kama ofa ya kutumia app yetu{'\n'}
                <Text style={styles.messageBold}>Bure kabisa!</Text>
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Vituo vyote vimefunguliwa</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Ubora wa juu (HD)</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Hakuna matangazo</Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.closeButtonGradient}
              >
                <Text style={styles.closeButtonText}>Anza Kutumia</Text>
                <Icon name="arrow-right" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
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
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradient: {
    padding: 30,
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 1,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    marginBottom: 20,
    zIndex: 2,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
    zIndex: 2,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 25,
    textAlign: 'center',
    zIndex: 2,
  },
  timeContainer: {
    width: '100%',
    marginBottom: 20,
    zIndex: 2,
  },
  timeBox: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  accessBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  accessBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4c1d95',
  },
  messageContainer: {
    marginBottom: 20,
    zIndex: 2,
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  messageBold: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  featuresList: {
    width: '100%',
    marginBottom: 25,
    zIndex: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    zIndex: 2,
  },
  closeButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
});

export default AdminAccessGrantedModal;
