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

const NotificationPermissionModal = ({ visible, onAllow, onDeny, onLater }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
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
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
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
            {/* Icon Section */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.iconCircle}
              >
                <Icon name="bell-ring" size={50} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Ruhusu Taarifa</Text>

            {/* Description */}
            <Text style={styles.description}>
              Supasoka inahitaji ruhusa ya kutuma taarifa ili ukupate habari za vituo vipya, mechi, na matangazo.
            </Text>

            {/* Benefits List */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Icon name="television" size={20} color="#3b82f6" />
                <Text style={styles.benefitText}>Vituo vipya</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="soccer" size={20} color="#10b981" />
                <Text style={styles.benefitText}>Mechi za moja kwa moja</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="movie-open" size={20} color="#f59e0b" />
                <Text style={styles.benefitText}>Filamu na vipindi vipya</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Allow Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onAllow}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Ruhusu</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary Buttons Row */}
              <View style={styles.secondaryButtonsRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onLater}
                  activeOpacity={0.7}
                >
                  <Icon name="clock-outline" size={18} color="#94a3b8" />
                  <Text style={styles.secondaryButtonText}>Baadaye</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onDeny}
                  activeOpacity={0.7}
                >
                  <Icon name="close-circle-outline" size={18} color="#94a3b8" />
                  <Text style={styles.secondaryButtonText}>Hapana</Text>
                </TouchableOpacity>
              </View>
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
    padding: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 24,
    padding: 30,
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
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 30,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginLeft: 12,
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 6,
    fontWeight: '600',
  },
});

export default NotificationPermissionModal;
