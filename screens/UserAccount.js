import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Platform,
  Modal,
  Animated,
  BackHandler,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppState } from '../contexts/AppStateContext';
import { useContact } from '../contexts/ContactContext';
import { useNotifications } from '../contexts/NotificationContext';
import apiService from '../services/api';
import adMobService from '../services/adMobService';
import NotificationToggleModal from '../components/NotificationToggleModal';

const UserAccount = ({ navigation, route }) => {
  const {
    user,
    points,
    remainingTime,
    isSubscribed,
    addPoints,
    updateUser,
    hasAdminAccess,
    subscriptionEndTime,
    formatRemainingTimeWithSeconds,
  } = useAppState();

  const [isAdLoading, setIsAdLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activeSheet, setActiveSheet] = useState(null);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [showAdSuccessModal, setShowAdSuccessModal] = useState(false);
  const [showAdErrorModal, setShowAdErrorModal] = useState(false);
  const [adErrorMessage, setAdErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const countdownScaleAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const errorScaleAnim = useRef(new Animated.Value(0)).current;
  const [showExitModal, setShowExitModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [watchHistory, setWatchHistory] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { contactSettings } = useContact();
  const { requestNotificationPermission } = useNotifications();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollToPoints = route.params?.scrollToPoints;

  // Generate unique username on first launch
  useEffect(() => {
    initializeUser();
    // AdMob is already initialized in App.js
    console.log('📱 UserAccount loaded, checking ad status...');
    setTimeout(() => {
      adMobService.printDiagnostics();
    }, 1000);
  }, []);

  // Calculate time left countdown - updates every second for real-time display
  useEffect(() => {
    if (!isSubscribed || remainingTime <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // Function to calculate time components from subscription end time
    const calculateTimeLeft = () => {
      let totalSeconds;

      // Use subscriptionEndTime for accurate countdown if available
      if (subscriptionEndTime) {
        const now = Date.now();
        const remainingMs = subscriptionEndTime - now;
        totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      } else {
        // Fallback to remainingTime in minutes
        totalSeconds = Math.floor(remainingTime * 60);
      }

      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second for real-time countdown
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [remainingTime, isSubscribed, subscriptionEndTime]);

  const initializeUser = async () => {
    try {
      // Get user data from storage (contains uniqueUserId from backend)
      const storedUser = await AsyncStorage.getItem('user');

      if (storedUser) {
        const userData = JSON.parse(storedUser);

        // Use uniqueUserId from backend as the username
        if (userData.uniqueUserId) {
          setUsername(userData.uniqueUserId);
          console.log('✅ Username loaded from backend:', userData.uniqueUserId);
        } else {
          // Fallback: generate username if not available
          const fallbackUsername = `User_${Math.random().toString(36).substr(2, 6)}`;
          setUsername(fallbackUsername);
          console.log('⚠️ Using fallback username:', fallbackUsername);
        }
      } else {
        // No user data yet, show loading
        setUsername('User_loading...');
        console.log('⏳ Waiting for user data...');
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      setUsername(`User_${Math.random().toString(36).substr(2, 6)}`);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleWatchAd = async () => {
    console.log('🎬 Watch ad clicked');

    setIsAdLoading(true);
    adMobService.printDiagnostics();

    const adStatus = adMobService.getAdStatus();

    if (adStatus.isReady) {
      console.log('✅ Ad ready, showing now');
      setCountdown(1); // ✅ FASTER: 1 second countdown
      setShowCountdownModal(true);
      Animated.spring(countdownScaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();

      // Quick countdown - ULTRA FAST
      let count = 1; // ✅ FASTER: 1 second only
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);

        if (count === 0) {
          clearInterval(countdownInterval);
          closeCountdownModal();

          // Show ad immediately - INSTANT
          setTimeout(() => {
            showRewardedAd();
          }, 100); // ✅ FASTER: 100ms instead of 200ms
        }
      }, 1000);

      return;
    }

    // Ad not ready, show loading message and load it
    console.log('⏳ Ad not ready, loading...');
    setIsAdLoading(true);

    // Show countdown modal with loading state - FASTER
    setCountdown(2); // ✅ FASTER: 2 seconds instead of 3
    setShowCountdownModal(true);
    Animated.spring(countdownScaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

    try {
      // Trigger ad load if not already loading
      if (!adStatus.isLoading) {
        console.log('🔄 Starting ad load...');
        adMobService.loadRewardedAd();
      }

      // Improved countdown - checks ad status every 300ms - FASTER
      let count = 2; // ✅ FASTER: Start with 2 seconds
      let checkCount = 0;
      const maxChecks = 30; // 9 seconds total (30 checks * 300ms)

      const countdownInterval = setInterval(() => {
        checkCount++;

        // Check if ad is ready every 500ms
        const currentStatus = adMobService.getAdStatus();

        if (currentStatus.isReady) {
          console.log('✅ Ad loaded! Showing now...');
          clearInterval(countdownInterval);
          closeCountdownModal();
          setIsAdLoading(false);

          setTimeout(() => {
            showRewardedAd();
          }, 100); // ✅ FASTER: 100ms instead of 200ms
          return;
        }

        // Update countdown faster (every 3 checks = ~900ms)
        if (checkCount % 3 === 0) {
          count--;

          if (count > 0) {
            setCountdown(count);
          } else {
            // After countdown finishes, show loading spinner
            setCountdown(0); // 0 triggers loading spinner in UI
            console.log(`⏳ Inapakia tangazo... (${Math.floor(checkCount / 2)}s)`);
          }
        }

        // Check if max wait time reached
        if (checkCount >= maxChecks) {
          console.log('❌ Ad failed to load in time');
          clearInterval(countdownInterval);
          closeCountdownModal();
          setIsAdLoading(false);
          showErrorModal('Tangazo halipatikani kwa sasa. Tafadhali jaribu tena baadaye.');
          return;
        }
      }, 300); // ✅ FASTER: Check every 300ms for ultra-fast response

    } catch (error) {
      console.error('❌ Error in ad flow:', error);
      closeCountdownModal();
      setIsAdLoading(false);
      showErrorModal('Hitilafu imetokea. Tafadhali jaribu tena.');
    }
  };

  const showRewardedAd = async () => {
    console.log('🎬 Showing rewarded ad...');

    try {
      const success = await adMobService.showRewardedAd(
        async (reward) => {
          // User earned reward
          console.log('🎉 User earned reward:', reward);

          // Award points to user
          await addPoints(10, 'Tangazo');

          // Record ad view in backend
          try {
            await apiService.post('/users/ads/view', {
              adType: 'rewarded',
              completed: true,
              pointsEarned: 10,
            });
          } catch (error) {
            console.error('Failed to record ad view:', error);
          }

          setIsAdLoading(false);

          // Show success modal
          setShowAdSuccessModal(true);
          Animated.spring(successScaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }).start();

          // Preload next ad in background for INSTANT availability - ULTRA FAST
          console.log('📦 Preloading next ad IMMEDIATELY...');
          setTimeout(() => {
            adMobService.loadRewardedAd();
          }, 100); // ✅ ULTRA FAST: 100ms for instant next ad
        },
        (error) => {
          // Error showing ad
          console.error('❌ Ad show error:', error);
          setIsAdLoading(false);
          showErrorModal(error || 'Tangazo halipatikani kwa sasa. Tafadhali jaribu tena.');

          // Try to reload ad for next attempt
          setTimeout(() => {
            console.log('🔄 Reloading ad after error...');
            adMobService.forceReload();
          }, 2000);
        }
      );

      if (!success) {
        console.log('❌ Ad show returned false');
        setIsAdLoading(false);
        showErrorModal('Tangazo halipatikani kwa sasa. Tafadhali jaribu tena.');

        // Try to reload ad
        setTimeout(() => {
          adMobService.forceReload();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Exception showing ad:', error);
      setIsAdLoading(false);
      showErrorModal('Imeshindikana kuonyesha tangazo. Tafadhali jaribu tena.');

      // Try to reload ad
      setTimeout(() => {
        adMobService.forceReload();
      }, 2000);
    }
  };

  const closeCountdownModal = () => {
    Animated.timing(countdownScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCountdownModal(false);
    });
  };

  const closeAdSuccessModal = () => {
    Animated.timing(successScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowAdSuccessModal(false);
    });
  };

  const showErrorModal = (message) => {
    setAdErrorMessage(message);
    setShowAdErrorModal(true);
    Animated.spring(errorScaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const closeAdErrorModal = () => {
    Animated.timing(errorScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowAdErrorModal(false);
    });
  };

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} dakika`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} saa ${mins} dakika`;
  };

  const openBottomSheet = async (sheetId) => {
    setActiveSheet(sheetId);

    // Load data based on sheet type
    if (sheetId === 'history') {
      await loadWatchHistory();
    } else if (sheetId === 'points') {
      await loadPointsHistory();
    }

    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const loadWatchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await apiService.get('/users/watch-history');
      setWatchHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load watch history:', error);
      setWatchHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadPointsHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await apiService.get('/users/points-history');
      setPointsHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load points history:', error);
      setPointsHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const closeBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setActiveSheet(null));
  };

  const handleExitApp = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    setShowExitModal(false);
    BackHandler.exitApp();
  };

  const handleCall = () => {
    if (contactSettings?.callUrl) {
      Linking.openURL(contactSettings.callUrl);
    } else {
      Alert.alert('Samahani', 'Namba ya simu haipatikani');
    }
  };

  const handleWhatsApp = () => {
    if (contactSettings?.whatsappUrl) {
      Linking.openURL(contactSettings.whatsappUrl);
    } else {
      Alert.alert('Samahani', 'Namba ya WhatsApp haipatikani');
    }
  };

  const handleNotificationSettings = async () => {
    try {
      // Check current permission status
      const permissionGranted = await AsyncStorage.getItem('notificationPermissionGranted');
      setNotificationsEnabled(permissionGranted === 'true');
      setShowNotificationModal(true);
    } catch (error) {
      console.error('Error checking notification status:', error);
      setNotificationsEnabled(false);
      setShowNotificationModal(true);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();

      if (granted) {
        setNotificationsEnabled(true);
        setShowNotificationModal(false);
        ToastAndroid.show('✅ Taarifa zimewashwa!', ToastAndroid.SHORT);
      } else {
        setShowNotificationModal(false);
        Alert.alert(
          '❌ Ruhusa Imekataliwa',
          'Ili uwashe taarifa, nenda kwenye Mipangilio ya Simu > Apps > Supasoka > Taarifa na uwashe.',
          [
            { text: 'Sawa', style: 'cancel' },
            {
              text: 'Fungua Mipangilio',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      ToastAndroid.show('❌ Imeshindikana kuwasha taarifa', ToastAndroid.SHORT);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await AsyncStorage.setItem('notificationPermissionGranted', 'false');
      setNotificationsEnabled(false);
      setShowNotificationModal(false);
      ToastAndroid.show('🔕 Taarifa zimezimwa', ToastAndroid.SHORT);

      // Guide user to system settings for complete disable
      setTimeout(() => {
        Alert.alert(
          'Mipangilio ya Simu',
          'Ili kuzima kabisa taarifa, nenda kwenye Mipangilio ya Simu > Apps > Supasoka > Taarifa na uzime.',
          [
            { text: 'Sawa', style: 'cancel' },
            {
              text: 'Fungua Mipangilio',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }, 500);
    } catch (error) {
      console.error('Error disabling notifications:', error);
      ToastAndroid.show('❌ Imeshindikana kuzima taarifa', ToastAndroid.SHORT);
    }
  };

  const menuItems = [
    {
      id: 'subscription',
      title: 'Kifurushi Changu',
      subtitle: isSubscribed ? `Muda: ${formatTime(remainingTime)}` : 'Huna kifurushi',
      icon: 'package-variant',
      color: '#3b82f6',
      onPress: () => openBottomSheet('subscription'),
    },
    {
      id: 'history',
      title: 'Historia ya Uangalizi',
      subtitle: 'Vituo ulivyoangalia',
      icon: 'history',
      color: '#8b5cf6',
      onPress: () => openBottomSheet('history'),
    },
    {
      id: 'points',
      title: 'Historia ya Points',
      subtitle: `Una points ${points}`,
      icon: 'star',
      color: '#f59e0b',
      onPress: () => openBottomSheet('points'),
    },
    {
      id: 'support',
      title: 'Usaidizi',
      subtitle: 'Wasiliana nasi',
      icon: 'help-circle',
      color: '#10b981',
      onPress: () => openBottomSheet('support'),
    },
    {
      id: 'notifications',
      title: 'Taarifa',
      subtitle: 'Washa au zima taarifa',
      icon: 'bell',
      color: '#f97316',
      onPress: handleNotificationSettings,
    },
    {
      id: 'exit',
      title: 'Funga App',
      subtitle: 'Toka kwenye programu',
      icon: 'exit-to-app',
      color: '#ef4444',
      onPress: handleExitApp,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Icon */}
          <View style={styles.profileIconContainer}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.profileIcon}
            >
              <Icon name="account" size={50} color="#fff" />
            </LinearGradient>
          </View>

          {/* Username */}
          <Text style={styles.username}>
            {isLoadingUser ? 'Inapakia...' : username}
          </Text>

          {/* Premium/Free Badge */}
          <View style={[
            styles.statusBadge,
            isSubscribed ? styles.premiumBadge : styles.freeBadge
          ]}>
            <Icon
              name={isSubscribed ? 'crown' : 'account-outline'}
              size={16}
              color="#fff"
            />
            <Text style={styles.statusBadgeText}>
              {isSubscribed ? 'PREMIUM' : 'FREE'}
            </Text>
          </View>
        </View>

        {/* Points Card */}
        <LinearGradient
          colors={['#f59e0b', '#ea580c', '#dc2626']}
          style={styles.pointsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.pointsCardContent}>
            <View style={styles.pointsIconWrapper}>
              <Icon name="star-circle" size={60} color="#fff" />
            </View>

            <View style={styles.pointsInfo}>
              <Text style={styles.pointsLabel}>Points Zangu</Text>
              <Text style={styles.pointsValue}>{points}</Text>
              <Text style={styles.pointsHint}>
                💡 120 pointi kwa Kituo 1
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.watchAdButton}
            onPress={handleWatchAd}
            disabled={isAdLoading}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
              style={styles.watchAdButtonGradient}
            >
              {isAdLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.watchAdButtonText}>Inapakia...</Text>
                </>
              ) : (
                <>
                  <Icon name="television-play" size={24} color="#fff" />
                  <Text style={styles.watchAdButtonText}>Angalia Tangazo</Text>
                  <View style={styles.pointsReward}>
                    <Text style={styles.pointsRewardText}>+10</Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={24} color="#fff" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Supasoka v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 Ghetto Developers</Text>
        </View>
      </ScrollView>

      {/* Bottom Sheet */}
      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={closeBottomSheet}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeBottomSheet}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {renderBottomSheetContent()}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContent}>
            <Icon name="exit-to-app" size={60} color="#ef4444" />
            <Text style={styles.exitModalTitle}>Funga App?</Text>
            <Text style={styles.exitModalText}>
              Je, una uhakika unataka kutoka kwenye Supasoka?
            </Text>
            <View style={styles.exitModalButtons}>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.cancelButton]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.cancelButtonText}>Ghairi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitModalButton, styles.confirmButton]}
                onPress={confirmExit}
              >
                <Text style={styles.confirmButtonText}>Funga</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Countdown Modal */}
      <Modal
        visible={showCountdownModal}
        transparent
        animationType="fade"
        onRequestClose={closeCountdownModal}
      >
        <View style={styles.countdownModalOverlay}>
          <Animated.View
            style={[
              styles.countdownModalContent,
              {
                transform: [{ scale: countdownScaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1e293b', '#0f172a']}
              style={styles.countdownGradient}
            >
              {/* Icon */}
              <View style={styles.countdownIconContainer}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.countdownIconGradient}
                >
                  <Icon name="television-play" size={50} color="#fff" />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.countdownTitle}>Inaandaa Tangazo</Text>

              {/* Countdown or Loading Spinner */}
              {countdown > 0 ? (
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                </View>
              ) : (
                <View style={styles.loadingSpinnerContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingSpinnerText}>Inapakia...</Text>
                </View>
              )}

              {/* Message */}
              <Text style={styles.countdownMessage}>
                {countdown > 0 ? 'Tangazo litaanza hivi karibuni' : 'Tafadhali subiri kidogo...'}
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Ad Success Modal */}
      <Modal
        visible={showAdSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={closeAdSuccessModal}
      >
        <View style={styles.adSuccessModalOverlay}>
          <Animated.View
            style={[
              styles.adSuccessModalContent,
              {
                transform: [{ scale: successScaleAnim }],
              },
            ]}
          >
            {/* Success Icon */}
            <View style={styles.adSuccessIconContainer}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.adSuccessIconGradient}
              >
                <Icon name="check-circle" size={70} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.adSuccessTitle}>Hongera!</Text>

            {/* Points Earned */}
            <View style={styles.pointsEarnedBox}>
              <Icon name="star" size={40} color="#f59e0b" />
              <Text style={styles.pointsEarnedText}>+10 Points</Text>
            </View>

            {/* Message */}
            <Text style={styles.adSuccessMessage}>
              Umepata points 10 kwa kuangalia tangazo!
            </Text>

            {/* Buttons */}
            <View style={styles.adSuccessButtons}>
              <TouchableOpacity
                style={styles.watchAgainButton}
                onPress={() => {
                  closeAdSuccessModal();
                  setTimeout(() => {
                    handleWatchAd();
                  }, 300);
                }}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.watchAgainGradient}
                >
                  <Icon name="play-circle" size={24} color="#fff" />
                  <Text style={styles.watchAgainText}>Angalia Tena</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adSuccessCloseButton}
                onPress={closeAdSuccessModal}
              >
                <Text style={styles.adSuccessCloseText}>Sawa</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Ad Error Modal */}
      <Modal
        visible={showAdErrorModal}
        transparent
        animationType="fade"
        onRequestClose={closeAdErrorModal}
      >
        <View style={styles.adErrorModalOverlay}>
          <Animated.View
            style={[
              styles.adErrorModalContent,
              {
                transform: [{ scale: errorScaleAnim }],
              },
            ]}
          >
            {/* Error Icon */}
            <View style={styles.adErrorIconContainer}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.adErrorIconGradient}
              >
                <Icon name="alert-circle" size={70} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.adErrorTitle}>Samahani</Text>

            {/* Message */}
            <Text style={styles.adErrorMessage}>
              {adErrorMessage}
            </Text>

            {/* Info Box */}
            <View style={styles.adErrorInfoBox}>
              <Icon name="information" size={24} color="#3b82f6" />
              <Text style={styles.adErrorInfoText}>
                Tafadhali hakikisha una mtandao wa intaneti na jaribu tena.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.adErrorButtons}>
              <TouchableOpacity
                style={styles.adErrorRetryButton}
                onPress={() => {
                  closeAdErrorModal();
                  setTimeout(() => {
                    handleWatchAd();
                  }, 300);
                }}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.adErrorRetryGradient}
                >
                  <Icon name="refresh" size={24} color="#fff" />
                  <Text style={styles.adErrorRetryText}>Jaribu Tena</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adErrorCloseButton}
                onPress={closeAdErrorModal}
              >
                <Text style={styles.adErrorCloseText}>Sawa</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Notification Toggle Modal */}
      <NotificationToggleModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onEnable={handleEnableNotifications}
        onDisable={handleDisableNotifications}
        isEnabled={notificationsEnabled}
      />
    </SafeAreaView>
  );

  function renderBottomSheetContent() {
    switch (activeSheet) {
      case 'subscription':
        return (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Icon name="package-variant" size={30} color="#3b82f6" />
              <Text style={styles.sheetTitle}>Kifurushi Changu</Text>
            </View>
            {isSubscribed ? (
              <View style={styles.sheetBody}>
                {/* Show admin access badge if granted by admin */}
                {hasAdminAccess && (
                  <View style={styles.adminAccessBadge}>
                    <Icon name="shield-check" size={20} color="#10b981" />
                    <Text style={styles.adminAccessText}>Umepewa na Msimamizi</Text>
                  </View>
                )}
                <Text style={styles.sheetLabel}>Umebakiwa na:</Text>
                <View style={styles.countdownContainer}>
                  <View style={styles.countdownItem}>
                    <Text style={styles.countdownValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
                    <Text style={styles.countdownLabel}>Siku</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownItem}>
                    <Text style={styles.countdownValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                    <Text style={styles.countdownLabel}>Masaa</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownItem}>
                    <Text style={styles.countdownValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                    <Text style={styles.countdownLabel}>Dakika</Text>
                  </View>
                  <Text style={styles.countdownSeparator}>:</Text>
                  <View style={styles.countdownItem}>
                    <Text style={styles.countdownValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
                    <Text style={styles.countdownLabel}>Sekunde</Text>
                  </View>
                </View>
                <Text style={styles.sheetHint}>
                  {hasAdminAccess
                    ? 'Muda wa ufikiaji uliopewa na msimamizi - vituo vyote vimefunguliwa!'
                    : 'Kama muda wa matumizi kutoka katika kifurushi chako'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.sheetBody}>
                <Text style={styles.sheetMessage}>Huna kifurushi cha sasa</Text>
                <TouchableOpacity
                  style={styles.sheetButton}
                  onPress={() => {
                    closeBottomSheet();
                    navigation.navigate('Payment');
                  }}
                >
                  <Text style={styles.sheetButtonText}>Lipia Kifurushi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'history':
        return (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Icon name="history" size={30} color="#8b5cf6" />
              <Text style={styles.sheetTitle}>Historia ya Uangalizi</Text>
            </View>
            <View style={styles.sheetBody}>
              <Text style={styles.sheetLabel}>Vituo ulivyoangalia zaidi:</Text>
              {isLoadingHistory ? (
                <Text style={styles.loadingText}>Inapakia...</Text>
              ) : watchHistory.length > 0 ? (
                <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                  {watchHistory.map((item, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Icon name="television" size={20} color="#8b5cf6" />
                      <Text style={styles.historyText}>
                        {item.channelName} - {item.watchCount} mara
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Hujatazama kituo chochote bado</Text>
              )}
            </View>
          </View>
        );

      case 'points':
        return (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Icon name="star" size={30} color="#f59e0b" />
              <Text style={styles.sheetTitle}>Historia ya Points</Text>
            </View>
            <View style={styles.sheetBody}>
              <Text style={styles.sheetLabel}>Jumla ya points ulizopata:</Text>
              <View style={styles.pointsSummary}>
                <Icon name="star-circle" size={50} color="#f59e0b" />
                <Text style={styles.totalPoints}>{points}</Text>
                <Text style={styles.pointsSubtext}>Points</Text>
              </View>
              {isLoadingHistory ? (
                <Text style={styles.loadingText}>Inapakia...</Text>
              ) : pointsHistory.length > 0 ? (
                <ScrollView style={styles.pointsBreakdown} showsVerticalScrollIndicator={false}>
                  {pointsHistory.map((item, index) => (
                    <View key={index} style={styles.pointsRow}>
                      <Text style={styles.pointsDate}>{item.date}</Text>
                      <Text style={styles.pointsAmount}>+{item.points} points</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Hujapata points bado</Text>
              )}
            </View>
          </View>
        );

      case 'support':
        return (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Icon name="help-circle" size={30} color="#10b981" />
              <Text style={styles.sheetTitle}>Usaidizi</Text>
            </View>
            <View style={styles.sheetBody}>
              <Text style={styles.sheetLabel}>Wasiliana nasi:</Text>
              <View style={styles.supportButtons}>
                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={handleCall}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.supportButtonGradient}
                  >
                    <Icon name="phone" size={30} color="#fff" />
                    <Text style={styles.supportButtonText}>Piga Simu</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={handleWhatsApp}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.supportButtonGradient}
                  >
                    <Icon name="whatsapp" size={30} color="#fff" />
                    <Text style={styles.supportButtonText}>WhatsApp</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  }
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  profileIconContainer: {
    marginBottom: 15,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#1f2937',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
  },
  freeBadge: {
    backgroundColor: '#6b7280',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pointsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pointsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsIconWrapper: {
    marginRight: 15,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 5,
  },
  pointsValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  pointsHint: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.85,
  },
  watchAdButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  watchAdButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  watchAdButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  pointsReward: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsRewardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  appInfoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  sheetContent: {
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sheetBody: {
    gap: 15,
  },
  sheetLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 10,
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  countdownSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 5,
  },
  sheetHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sheetMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginVertical: 20,
  },
  sheetButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 10,
    gap: 12,
  },
  historyText: {
    fontSize: 16,
    color: '#fff',
  },
  pointsSummary: {
    alignItems: 'center',
    marginVertical: 20,
  },
  totalPoints: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginTop: 10,
  },
  pointsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  pointsBreakdown: {
    gap: 10,
    maxHeight: 200,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
  },
  pointsDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  pointsAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  supportButtons: {
    gap: 15,
  },
  supportButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  supportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  supportButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
  },
  exitModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  exitModalText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 25,
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  exitModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Countdown Modal Styles
  countdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownModalContent: {
    alignItems: 'center',
    padding: 40,
  },
  countdownIconContainer: {
    marginBottom: 20,
  },
  countdownIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  countdownGradient: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  countdownNumber: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
  },
  countdownTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  countdownMessage: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingSpinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  loadingSpinnerText: {
    fontSize: 16,
    color: '#cbd5e1',
    marginTop: 15,
    fontWeight: '600',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  dotActive: {
    backgroundColor: '#3b82f6',
  },
  // Ad Success Modal Styles
  adSuccessModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adSuccessModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  adSuccessIconContainer: {
    marginBottom: 25,
  },
  adSuccessIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adSuccessTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  pointsEarnedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 50,
    marginBottom: 20,
    gap: 15,
  },
  pointsEarnedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  adSuccessMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  adSuccessButtons: {
    width: '100%',
    gap: 12,
  },
  watchAgainButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  watchAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  watchAgainText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  adSuccessCloseButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  adSuccessCloseText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  // Ad Error Modal Styles
  adErrorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adErrorModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  adErrorIconContainer: {
    marginBottom: 25,
  },
  adErrorIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adErrorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  adErrorMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  adErrorInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    gap: 15,
  },
  adErrorInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#3b82f6',
    lineHeight: 20,
  },
  adErrorButtons: {
    width: '100%',
    gap: 12,
  },
  adErrorRetryButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  adErrorRetryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  adErrorRetryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  adErrorCloseButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  adErrorCloseText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  // Admin Access Badge Styles
  adminAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  adminAccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
};

export default UserAccount;


