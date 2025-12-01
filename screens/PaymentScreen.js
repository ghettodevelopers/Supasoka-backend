import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import paymentService from '../services/paymentService';
import zenoPayService from '../services/zenoPayService';
import { useAppState } from '../contexts/AppStateContext';

const PaymentScreen = ({ navigation }) => {
  const { user, updateSubscriptionStatus, updateRemainingTime } = useAppState();
  
  const [selectedBundle, setSelectedBundle] = useState('month');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedBundleData, setSelectedBundleData] = useState(null);
  const modalSlideAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  const bundles = [
    { id: 'week', name: 'Wiki 1', price: 3000, days: 7 },
    { id: 'month', name: 'Mwezi 1', price: 7000, days: 30 },
    { id: 'year', name: 'Mwaka 1', price: 15000, days: 365 },
  ];

  const supportedNetworks = paymentService.getSupportedNetworks();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-detect network from phone number
    if (phoneNumber.length >= 10) {
      const detected = paymentService.detectNetworkFromPhone(phoneNumber);
      if (detected) {
        setSelectedNetwork(detected);
      }
    }
  }, [phoneNumber]);

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    
    // Support numbers starting with 0 (10 digits) or without 0 (9 digits)
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
    }
  };

  const handlePhoneChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const handlePayment = async () => {
    if (!phoneNumber || !selectedNetwork) {
      Alert.alert('Taarifa Zinazohitajika', 'Tafadhali weka namba ya simu na chagua mtandao');
      return;
    }

    if (!isConnected) {
      Alert.alert('Hakuna Mtandao', 'Tafadhali washa mtandao kwanza');
      return;
    }

    const bundle = bundles.find(b => b.id === selectedBundle);
    const cleanPhone = phoneNumber.replace(/\s/g, '');

    // Validate payment data
    const validation = zenoPayService.validatePaymentData({
      phone: cleanPhone,
      amount: bundle.price,
      network: selectedNetwork.id,
    });

    if (!validation.valid) {
      Alert.alert('Kosa', validation.error);
      return;
    }

    setIsLoading(true);

    try {
      // Generate unique reference
      const reference = zenoPayService.generateReference();

      // Initiate ZenoPay payment
      const result = await zenoPayService.initiatePayment({
        phone: cleanPhone,
        amount: bundle.price,
        network: selectedNetwork.id,
        reference: reference,
        description: `Supasoka ${bundle.name} Subscription`,
      });

      if (result.success) {
        // Payment initiated successfully - Show beautiful modal
        setPaymentReference(reference);
        setSelectedBundleData(bundle);
        setShowPaymentModal(true);
        
        // Animate modal
        Animated.spring(modalSlideAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      } else {
        // Payment failed
        Alert.alert(
          'Malipo Yameshindikana',
          result.error || 'Tafadhali jaribu tena au wasiliana na msaada.',
          [{ text: 'Sawa' }]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Hitilafu ya Malipo',
        'Imeshindikana kuanzisha malipo. Tafadhali jaribu tena.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const closePaymentModal = () => {
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPaymentModal(false);
    });
  };

  const checkPaymentStatus = async (reference, bundle) => {
    setIsLoading(true);
    
    try {
      const result = await zenoPayService.checkPaymentStatus(reference);
      
      // Check ZenoPay response format
      if (result.success && result.data.data && result.data.data.length > 0) {
        const paymentData = result.data.data[0];
        const status = paymentData.payment_status;
        
        if (status === 'COMPLETED') {
          // Payment successful - Show beautiful success modal
          await updateSubscriptionStatus(true);
          await updateRemainingTime(bundle.days * 24 * 60);
          
          // Close payment modal first
          if (showPaymentModal) {
            closePaymentModal();
          }
          
          // Show success modal
          setSelectedBundleData(bundle);
          setShowSuccessModal(true);
          
          // Animate success modal
          Animated.spring(successScaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }).start();
        } else if (status === 'PENDING' || status === 'PROCESSING') {
          Alert.alert(
            '⏳ Inasubiri Uthibitisho',
            'Malipo bado yanasubiri uthibitisho. Tafadhali thibitisha kwenye simu yako.',
            [
              {
                text: 'Angalia Tena',
                onPress: () => checkPaymentStatus(reference, bundle),
              },
              {
                text: 'Sawa',
                style: 'cancel',
              },
            ]
          );
        } else {
          Alert.alert(
            'Malipo Hayajakamilika',
            `Hali ya malipo: ${status}. Tafadhali thibitisha au jaribu tena.`,
            [{ text: 'Sawa' }]
          );
        }
      } else {
        Alert.alert(
          'Malipo Hayajapatikana',
          'Imeshindikana kupata taarifa za malipo. Tafadhali jaribu tena.',
          [{ text: 'Sawa' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Kosa',
        'Imeshindikana kuangalia hali ya malipo. Tafadhali jaribu tena.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showInstructions = (instructions) => {
    if (!instructions) return;

    const message = instructions.steps.join('\n\n');
    const fullMessage = instructions.alternative
      ? `${message}\n\n${instructions.alternative}`
      : message;

    Alert.alert(instructions.title, fullMessage, [{ text: 'Nimeelewa' }]);
  };

  const simulatePaymentSuccess = async (bundle) => {
    // Simulate payment processing
    setTimeout(async () => {
      await updateSubscriptionStatus(true);
      await updateRemainingTime(bundle.days * 24 * 60); // Convert days to minutes
      
      Alert.alert(
        'Malipo Yamekamilika!',
        `Umepata muda wa ${bundle.name}. Unaweza kuangalia vituo vyote sasa!`,
        [
          {
            text: 'Sawa',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Chagua Kifurushi</Text>
          <Text style={styles.mainTitle}>Unachoweza Kukimudu</Text>
          <Text style={styles.subtitle}>Hapa Chini</Text>
        </View>

        {/* Bundles */}
        <View style={styles.bundlesContainer}>
          {bundles.map((bundle) => (
            <TouchableOpacity
              key={bundle.id}
              style={[
                styles.bundleCard,
                selectedBundle === bundle.id && styles.bundleCardSelected,
              ]}
              onPress={() => setSelectedBundle(bundle.id)}
            >
              {/* Badges */}
              {bundle.id === 'month' && (
                <View style={styles.popularBadge}>
                  <Icon name="star" size={14} color="#fff" />
                  <Text style={styles.popularText}>PENDWA</Text>
                </View>
              )}
              {bundle.id === 'year' && (
                <View style={styles.bestValueBadge}>
                  <Icon name="trophy" size={14} color="#fff" />
                  <Text style={styles.bestValueText}>BORA ZAIDI</Text>
                </View>
              )}

              <View style={styles.bundleContent}>
                <View style={styles.bundleIcon}>
                  <Icon 
                    name={bundle.id === 'week' ? 'calendar-week' : bundle.id === 'month' ? 'calendar-month' : 'calendar-range'} 
                    size={26} 
                    color={selectedBundle === bundle.id ? '#10b981' : '#3b82f6'} 
                  />
                </View>
                
                <View style={styles.bundleMainInfo}>
                  <View style={styles.bundleNameRow}>
                    <Text style={styles.bundleName}>{bundle.name}</Text>
                    <View style={styles.bundlePriceContainer}>
                      <Text style={styles.bundlePrice}>
                        {bundle.price.toLocaleString()}
                      </Text>
                      <Text style={styles.bundleCurrency}>TZS</Text>
                    </View>
                  </View>
                  <Text style={styles.bundleDays}>{bundle.days} Siku</Text>
                </View>

                {selectedBundle === bundle.id && (
                  <View style={styles.checkIcon}>
                    <Icon name="check-circle" size={24} color="#10b981" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Phone Number */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Namba ya Simu</Text>
          <View style={styles.inputContainer}>
            <Icon name="phone" size={20} color="#9ca3af" />
            <TextInput
              style={styles.input}
              placeholder="0712 345 678"
              placeholderTextColor="#6b7280"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>
        </View>

        {/* Networks */}
        {supportedNetworks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Chagua Mtandao wa Malipo</Text>
            <View style={styles.networkGrid}>
              {supportedNetworks.map((network) => (
                <TouchableOpacity
                  key={network.id}
                  style={[
                    styles.networkCard,
                    selectedNetwork?.id === network.id && styles.networkCardSelected,
                  ]}
                  onPress={() => setSelectedNetwork(network)}
                >
                  <Text style={styles.networkName}>{network.displayName}</Text>
                  <Text style={styles.networkCode}>{network.shortCode}</Text>
                  {selectedNetwork?.id === network.id && (
                    <View style={styles.selectedBadge}>
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!phoneNumber || !selectedNetwork || !isConnected) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!phoneNumber || !selectedNetwork || !isConnected || isLoading}
        >
          <LinearGradient
            colors={
              phoneNumber && selectedNetwork && isConnected
                ? ['#3b82f6', '#2563eb']
                : ['#4a5568', '#2d3748']
            }
            style={styles.payButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="cash" size={20} color="#fff" />
                <Text style={styles.payButtonText}>
                  Lipia Tsh. {bundles.find(b => b.id === selectedBundle)?.price.toLocaleString()}/=
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {!isConnected && (
          <View style={styles.warningBanner}>
            <Icon name="wifi-off" size={20} color="#ef4444" />
            <Text style={styles.warningText}>Hakuna muunganisho wa mtandao</Text>
          </View>
        )}
      </ScrollView>

      {/* Payment Initiated Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={closePaymentModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={closePaymentModal}
        >
          <Animated.View
            style={[
              styles.paymentModalContent,
              {
                transform: [{
                  translateY: modalSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Icon */}
              <View style={styles.modalIconContainer}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.modalIconGradient}
                >
                  <Icon name="cellphone-check" size={50} color="#fff" />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>Malipo Yametumwa!</Text>
              
              {/* Message */}
              <Text style={styles.modalMessage}>
                Ombi la malipo limetumwa kwa {selectedNetwork ? zenoPayService.getNetworkName(selectedNetwork.id) : 'mtandao wako'}.
              </Text>
              
              <Text style={styles.modalSubMessage}>
                Angalia simu yako {phoneNumber} na thibitisha malipo kwa kuweka PIN yako.
              </Text>

              {/* Reference */}
              <View style={styles.referenceBox}>
                <Text style={styles.referenceLabel}>Namba ya Kumbukumbu:</Text>
                <Text style={styles.referenceNumber}>{paymentReference}</Text>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.checkStatusButton}
                  onPress={() => {
                    closePaymentModal();
                    setTimeout(() => {
                      checkPaymentStatus(paymentReference, selectedBundleData);
                    }, 300);
                  }}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.modalButtonGradient}
                  >
                    <Icon name="refresh" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Angalia Hali</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={closePaymentModal}
                >
                  <Text style={styles.closeModalText}>Sawa</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.navigate('Home');
        }}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View
            style={[
              styles.successModalContent,
              {
                transform: [{
                  scale: successScaleAnim,
                }],
              },
            ]}
          >
            {/* Success Icon with Animation */}
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.successIconGradient}
              >
                <Icon name="check-circle" size={70} color="#fff" />
              </LinearGradient>
            </View>

            {/* Success Title */}
            <Text style={styles.successTitle}>Malipo Yamepokelewa!</Text>
            
            {/* Success Message */}
            <Text style={styles.successMessage}>
              Hongera! Malipo yako yamekamilika kikamilifu.
            </Text>

            {/* Bundle Info */}
            {selectedBundleData && (
              <View style={styles.bundleInfoBox}>
                <View style={styles.bundleInfoRow}>
                  <Icon name="package-variant" size={24} color="#10b981" />
                  <Text style={styles.bundleInfoText}>{selectedBundleData.name}</Text>
                </View>
                <View style={styles.bundleInfoRow}>
                  <Icon name="clock-outline" size={24} color="#10b981" />
                  <Text style={styles.bundleInfoText}>
                    {selectedBundleData.days} Siku
                  </Text>
                </View>
              </View>
            )}

            {/* Access Message */}
            <View style={styles.accessMessageBox}>
              <Icon name="television-play" size={30} color="#10b981" />
              <Text style={styles.accessMessage}>
                Sasa unaweza kuangalia vituo vyote kwa muda wa {selectedBundleData?.name}!
              </Text>
            </View>

            {/* Start Watching Button */}
            <TouchableOpacity
              style={styles.startWatchingButton}
              onPress={() => {
                setShowSuccessModal(false);
                Animated.timing(successScaleAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start(() => {
                  navigation.navigate('Home');
                });
              }}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.startWatchingGradient}
              >
                <Icon name="play-circle" size={24} color="#fff" />
                <Text style={styles.startWatchingText}>Anza Kutazama</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  backButton: {
    padding: 15,
    marginLeft: 5,
    marginTop: 5,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 5,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  bundlesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  bundleCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  bundleCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#1e3a2e',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
    zIndex: 10,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
    zIndex: 10,
  },
  bestValueText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  bundleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  bundleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bundleMainInfo: {
    flex: 1,
  },
  bundleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  bundleInfo: {
    flex: 1,
  },
  bundleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 20,
  },
  bundleDays: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bundlePriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceWithBadge: {
    marginRight: 8,
  },
  bundlePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 4,
  },
  bundleCurrency: {
    fontSize: 11,
    color: '#9ca3af',
  },
  checkIcon: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 15,
    marginLeft: 10,
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  networkCard: {
    width: '48%',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 10,
    margin: '1%',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  networkCardSelected: {
    borderColor: '#3b82f6',
  },
  networkName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  networkCode: {
    fontSize: 11,
    color: '#9ca3af',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButton: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
  },
  warningText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  paymentModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 30,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  modalSubMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  referenceBox: {
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
  },
  referenceLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 5,
  },
  referenceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  modalButtons: {
    gap: 12,
  },
  checkStatusButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeModalButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  successIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  successMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  bundleInfoBox: {
    backgroundColor: '#374151',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    gap: 15,
  },
  bundleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  bundleInfoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  accessMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    gap: 15,
  },
  accessMessage: {
    flex: 1,
    fontSize: 15,
    color: '#10b981',
    fontWeight: '600',
    lineHeight: 22,
  },
  startWatchingButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  startWatchingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startWatchingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
};

export default PaymentScreen;
