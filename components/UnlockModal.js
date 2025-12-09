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

const UnlockModal = ({ visible, onClose, onPayment, onPoints, points, requiredPoints = 120 }) => {
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

  const hasEnoughPoints = points >= requiredPoints;

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
                colors={['#f59e0b', '#d97706']}
                style={styles.iconGradient}
              >
                <Icon name="lock" size={48} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Hauna Kifurushi</Text>

            {/* Message */}
            <Text style={styles.message}>
              Je, ungependa unapendelea?
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Payment Option */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onPayment}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.optionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.optionContent}>
                    <Icon name="credit-card" size={24} color="#fff" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Chagua Kifurushi</Text>
                      <Text style={styles.optionSubtitle}>Fungua vituo vyote kwa muda</Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Points Option */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onPoints}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={hasEnoughPoints ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
                  style={styles.optionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.optionContent}>
                    <Icon name="star" size={24} color="#fff" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Lipia Kwa Points</Text>
                      <Text style={styles.optionSubtitle}>
                        {hasEnoughPoints 
                          ? `Fungua kituo kimoja (${requiredPoints} points)` 
                          : `Unahitaji ${requiredPoints} points (una ${points})`}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Benefits List */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Faida za Kifurushi:</Text>
              <View style={styles.benefitItem}>
                <Icon name="check-circle" size={18} color="#10b981" />
                <Text style={styles.benefitText}>Vituo vyote bila kikomo</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="check-circle" size={18} color="#10b981" />
                <Text style={styles.benefitText}>Ubora wa HD</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="check-circle" size={18} color="#10b981" />
                <Text style={styles.benefitText}>Hakuna matangazo</Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Baadaye</Text>
            </TouchableOpacity>
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
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  optionButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  optionSubtitle: {
    color: '#e2e8f0',
    fontSize: 13,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginLeft: 10,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UnlockModal;
