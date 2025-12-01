import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  StatusBar,
  StyleSheet,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppState } from '../contexts/AppStateContext';
import drmService from '../services/drmService';
import PRODUCTION_CONFIG from '../config/production';

const { width, height } = Dimensions.get('window');

const PlayerScreen = ({ route, navigation }) => {
  const { channel } = route.params;
  const { addWatchHistoryEntry, updateWatchDuration } = useAppState();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [videoSource, setVideoSource] = useState(null);
  const [drmLoading, setDrmLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [unlockType, setUnlockType] = useState(''); // 'points' or 'payment'
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const videoRef = useRef(null);
  const watchStartTime = useRef(Date.now());
  const unlockModalAnim = useRef(new Animated.Value(0)).current;
  const comingSoonAnim = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(1)).current;
  const { isSubscribed, isChannelUnlocked, points, spendPoints, unlockChannel } = useAppState();

  useEffect(() => {
    // Lock to portrait initially
    Orientation.lockToPortrait();
    
    initializeVideo();
    addWatchHistoryEntry(channel);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      backHandler.remove();
      // Ensure portrait before exit
      if (isFullscreen) {
        Orientation.lockToPortrait();
      }
      handleExit();
    };
  }, [isFullscreen]);

  // Check if channel needs unlock on mount
  useEffect(() => {
    console.log('🔍 Channel check:', {
      channelName: channel.name,
      isFree: channel.isFree,
      isSubscribed,
      isUnlocked: isChannelUnlocked(channel.id)
    });

    if (!isSubscribed && !channel.isFree && !isChannelUnlocked(channel.id)) {
      console.log('🔒 Channel locked - showing unlock modal');
      // Show unlock modal
      setShowUnlockModal(true);
      Animated.spring(unlockModalAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      console.log('✅ Channel accessible - no unlock needed');
    }
  }, []);

  const initializeVideo = async () => {
    try {
      console.log('🎬 Initializing video for:', channel.name);
      console.log('📺 Stream URL:', channel.streamUrl);
      
      // Check if stream URL exists
      if (!channel.streamUrl || channel.streamUrl.trim() === '') {
        console.log('⚠️ No stream URL - showing coming soon modal');
        setLoading(false);
        setShowComingSoonModal(true);
        Animated.spring(comingSoonAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();
        return;
      }
      
      setLoading(true);
      setError(null);

      let source = { uri: channel.streamUrl };

      // Handle DRM if enabled
      if (channel.drmEnabled && channel.drmConfig) {
        console.log('🔐 DRM enabled, preprocessing...');
        setDrmLoading(true);
        const drmConfig = await drmService.preprocessDRM(channel);
        
        if (drmConfig) {
          source = {
            uri: channel.streamUrl,
            drm: drmConfig,
          };
          console.log('✅ DRM config applied');
        }
        setDrmLoading(false);
      }

      console.log('✅ Video source set:', source);
      setVideoSource(source);
    } catch (err) {
      console.error('❌ Video initialization error:', err);
      setError('Hitilafu ya kuanzisha video');
      setLoading(false);
    }
  };

  const handleBack = () => {
    // If in fullscreen, exit fullscreen first with smooth transition
    if (isFullscreen) {
      setIsTransitioning(true);
      
      // Fade out slightly
      Animated.timing(transitionOpacity, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // Lock to portrait
        Orientation.lockToPortrait();
        setIsFullscreen(false);
        
        // Wait for orientation change
        setTimeout(() => {
          // Fade back in
          Animated.timing(transitionOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setIsTransitioning(false);
            handleExit();
            navigation.goBack();
          });
        }, 200);
      });
    } else {
      handleExit();
      navigation.goBack();
    }
    return true;
  };

  const handleExit = () => {
    const watchDuration = Math.floor((Date.now() - watchStartTime.current) / 1000 / 60);
    if (watchDuration > 0) {
      updateWatchDuration(channel.id, watchDuration);
    }
  };

  const handleLoad = () => {
    console.log('✅ Video loaded successfully');
    console.log('📺 Video is now playing');
    setLoading(false);
  };

  const handleError = (error) => {
    console.error('Video playback error:', error);
    
    let errorMessage = 'Hitilafu ya kucheza video';
    
    if (error.error?.code === 'DRM_ERROR') {
      errorMessage = 'Hitilafu ya usalama wa video. Kituo hakiwezi kuchezwa.';
    } else if (error.error?.code === 'NETWORK_ERROR') {
      errorMessage = 'Hitilafu ya mtandao. Hakikisha una muunganisho mzuri.';
    } else if (error.error?.code === 'DECODER_ERROR') {
      errorMessage = 'Hitilafu ya decoder. Video haiwezi kuchezwa kwenye kifaa hiki.';
    } else if (error.error?.code === 'SOURCE_ERROR') {
      errorMessage = 'Kituo hakipatikani. Jaribu kituo kingine.';
    }

    setError(errorMessage);
    setLoading(false);

    // Auto-retry for network errors
    if (error.error?.code === 'NETWORK_ERROR') {
      setTimeout(() => {
        setError(null);
        initializeVideo();
      }, 3000);
    }
  };

  const getBufferConfig = () => {
    const streamUrl = channel.streamUrl.toLowerCase();
    
    if (channel.drmEnabled || streamUrl.includes('.mpd')) {
      return PRODUCTION_CONFIG.VIDEO.BUFFER_CONFIG.DRM;
    } else if (streamUrl.includes('.m3u8')) {
      return PRODUCTION_CONFIG.VIDEO.BUFFER_CONFIG.HLS;
    } else {
      return PRODUCTION_CONFIG.VIDEO.BUFFER_CONFIG.DEFAULT;
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      // Exit fullscreen - go to portrait
      Orientation.lockToPortrait();
      setIsFullscreen(false);
    } else {
      // Enter fullscreen - go to landscape
      Orientation.lockToLandscape();
      setIsFullscreen(true);
    }
  };

  const handleUnlockWithPoints = async () => {
    if (points < 100) {
      Alert.alert(
        'Points Hazitoshi',
        'Unahitaji points 100 kufungua kituo. Una points ' + points + ' tu.',
        [{ text: 'Sawa' }]
      );
      return;
    }

    try {
      await spendPoints(100, `Unlock ${channel.name}`);
      await unlockChannel(channel.id);
      closeUnlockModal();
      Alert.alert('Hongera!', 'Umefungua kituo kwa points 100!');
    } catch (error) {
      Alert.alert('Kosa', 'Imeshindikana kufungua kituo. Jaribu tena.');
    }
  };

  const handleUnlockWithPayment = () => {
    closeUnlockModal();
    navigation.navigate('Payment');
  };

  const closeUnlockModal = () => {
    Animated.timing(unlockModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUnlockModal(false);
    });
  };

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeVideo}>
            <Text style={styles.retryButtonText}>Jaribu Tena</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: transitionOpacity }]}>
      <StatusBar hidden />
      
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBack}
        disabled={isTransitioning}
      >
        <Icon name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>

      {videoSource ? (
        <Video
          ref={videoRef}
          source={videoSource}
          style={styles.video}
          paused={paused}
          resizeMode="contain"
          onLoad={handleLoad}
          onError={handleError}
          onLoadStart={() => console.log('📺 Video load started')}
          onBuffer={({ isBuffering }) => console.log('🔄 Buffering:', isBuffering)}
          onProgress={(data) => console.log('⏱️ Progress:', data.currentTime)}
          bufferConfig={getBufferConfig()}
          controls={true}
          ignoreSilentSwitch="ignore"
        />
      ) : (
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>Hakuna video source</Text>
        </View>
      )}

      {(loading || drmLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          {drmLoading && (
            <View style={styles.drmLoadingContainer}>
              <Icon name="shield-check" size={32} color="#3b82f6" />
              <Text style={styles.loadingText}>Inaanzisha usalama...</Text>
            </View>
          )}
          {loading && !drmLoading && (
            <Text style={styles.loadingText}>Inapakia...</Text>
          )}
        </View>
      )}

      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{channel.name}</Text>
      </View>

      {/* Fullscreen Toggle Button */}
      <TouchableOpacity style={styles.fullscreenButton} onPress={toggleFullscreen}>
        <Icon 
          name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
          size={28} 
          color="#fff" 
        />
      </TouchableOpacity>

      {/* Unlock Modal */}
      <Modal
        visible={showUnlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.unlockModalOverlay}>
          <Animated.View
            style={[
              styles.unlockModalContent,
              {
                transform: [{ scale: unlockModalAnim }],
              },
            ]}
          >
            {/* Lock Icon */}
            <View style={styles.unlockIconContainer}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.unlockIconGradient}
              >
                <Icon name="lock" size={60} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.unlockTitle}>Kituo Kimefungwa</Text>
            
            {/* Message */}
            <Text style={styles.unlockMessage}>
              Kituo "{channel.name}" kimefungwa. Chagua njia ya kufungua:
            </Text>

            {/* Options */}
            <View style={styles.unlockOptions}>
              {/* Points Option */}
              <TouchableOpacity
                style={styles.unlockOption}
                onPress={handleUnlockWithPoints}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.unlockOptionGradient}
                >
                  <Icon name="star" size={32} color="#fff" />
                  <Text style={styles.unlockOptionTitle}>Tumia Points</Text>
                  <Text style={styles.unlockOptionDesc}>100 Points</Text>
                  <Text style={styles.unlockOptionPoints}>Una: {points} points</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Payment Option */}
              <TouchableOpacity
                style={styles.unlockOption}
                onPress={handleUnlockWithPayment}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.unlockOptionGradient}
                >
                  <Icon name="credit-card" size={32} color="#fff" />
                  <Text style={styles.unlockOptionTitle}>Lipia</Text>
                  <Text style={styles.unlockOptionDesc}>Tsh 3,000 - 15,000</Text>
                  <Text style={styles.unlockOptionPoints}>Angalia vituo vyote</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.unlockCancelButton}
              onPress={() => {
                closeUnlockModal();
                navigation.goBack();
              }}
            >
              <Text style={styles.unlockCancelText}>Rudi Nyuma</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Coming Soon Modal */}
      <Modal
        visible={showComingSoonModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.comingSoonModalOverlay}>
          <Animated.View
            style={[
              styles.comingSoonModalContent,
              {
                transform: [{ scale: comingSoonAnim }],
              },
            ]}
          >
            {/* Icon */}
            <View style={styles.comingSoonIconContainer}>
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.comingSoonIconGradient}
              >
                <Icon name="clock-outline" size={70} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.comingSoonTitle}>Kituo Kinakuja Hivi Karibuni!</Text>
            
            {/* Channel Name */}
            <View style={styles.comingSoonChannelBox}>
              <Icon name="television" size={32} color="#8b5cf6" />
              <Text style={styles.comingSoonChannelName}>{channel.name}</Text>
            </View>

            {/* Message */}
            <Text style={styles.comingSoonMessage}>
              Samahani, kituo hiki bado hakijapatikana. Tunafanya kazi kukiongeza hivi karibuni.
            </Text>

            {/* Info Box */}
            <View style={styles.comingSoonInfoBox}>
              <Icon name="information" size={24} color="#3b82f6" />
              <Text style={styles.comingSoonInfoText}>
                Kwa sasa, rudi nyuma na uchague kituo kingine kutoka kwenye orodha.
              </Text>
            </View>

            {/* Button */}
            <TouchableOpacity
              style={styles.comingSoonButton}
              onPress={() => {
                Animated.timing(comingSoonAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start(() => {
                  setShowComingSoonModal(false);
                  navigation.goBack();
                });
              }}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.comingSoonButtonGradient}
              >
                <Icon name="arrow-left" size={24} color="#fff" />
                <Text style={styles.comingSoonButtonText}>Rudi Nyuma</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: '#fff',
    fontSize: 18,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  drmLoadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  channelInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  channelName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  fullscreenButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Unlock Modal Styles
  unlockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unlockModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  unlockIconContainer: {
    marginBottom: 25,
  },
  unlockIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  unlockMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  unlockOptions: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
    width: '100%',
  },
  unlockOption: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  unlockOptionGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  unlockOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  unlockOptionDesc: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  unlockOptionPoints: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
  },
  unlockCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  unlockCancelText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  // Coming Soon Modal Styles
  comingSoonModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  comingSoonModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  comingSoonIconContainer: {
    marginBottom: 25,
  },
  comingSoonIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  comingSoonChannelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 20,
    gap: 12,
  },
  comingSoonChannelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  comingSoonMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  comingSoonInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    gap: 15,
  },
  comingSoonInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#3b82f6',
    lineHeight: 20,
  },
  comingSoonButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  comingSoonButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  comingSoonButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
};

export default PlayerScreen;
