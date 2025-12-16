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
  Image,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppState } from '../contexts/AppStateContext';
import drmService from '../services/drmService';
import PRODUCTION_CONFIG from '../config/production';

// Video format detection helper
const getVideoType = (url) => {
  if (!url) return 'unknown';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.m3u8')) return 'hls';
  if (lowerUrl.includes('.mpd')) return 'dash';
  if (lowerUrl.includes('.mp4')) return 'mp4';
  if (lowerUrl.includes('.webm')) return 'webm';
  return 'auto';
};

const { width, height } = Dimensions.get('window');

const PlayerScreen = ({ route, navigation }) => {
  const { channel } = route.params;
  const { addWatchHistoryEntry, updateWatchDuration, isSubscribed, lockChannelTemporarily } = useAppState();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [videoSource, setVideoSource] = useState(null);
  const [drmLoading, setDrmLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const videoRef = useRef(null);
  const watchStartTime = useRef(Date.now());
  const comingSoonAnim = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(1)).current;

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

  // Channel access is already checked in HomeScreen before navigation
  // No need to check again here

  const initializeVideo = async () => {
    try {
      console.log('🎬 Initializing video for:', channel.name);
      console.log('📺 Stream URL:', channel.streamUrl);
      console.log('🔐 DRM Enabled:', channel.drmEnabled);

      // Check if stream URL exists
      if (!channel.streamUrl || channel.streamUrl.trim() === '') {
        console.log('⚠️ No stream URL - showing coming soon modal');
        setLoading(false);
        setDrmLoading(false);
        setShowComingSoonModal(true);
        Animated.spring(comingSoonAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();
        return;
      }

      setError(null);
      setLoading(true);

      // Detect video format
      const videoType = getVideoType(channel.streamUrl);
      console.log('📹 Video format detected:', videoType);

      // Parse drmConfig if it's a string (from database)
      let parsedDrmConfig = null;
      if (channel.drmConfig) {
        try {
          parsedDrmConfig = typeof channel.drmConfig === 'string' 
            ? JSON.parse(channel.drmConfig) 
            : channel.drmConfig;
          console.log('🔐 Parsed DRM config:', parsedDrmConfig);
        } catch (e) {
          console.error('❌ Failed to parse drmConfig:', e);
        }
      }

      // Check if DRM is enabled - fast check using drmConfig presence
      const hasDRM = parsedDrmConfig && parsedDrmConfig.clearKey;

      // Build optimized video source based on format
      let source = {
        uri: channel.streamUrl,
        headers: {
          'User-Agent': 'Supasoka/1.0 (Android)',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        // Specify type for better compatibility
        type: videoType === 'hls' ? 'm3u8' : videoType === 'dash' ? 'mpd' : undefined,
      };

      if (hasDRM && videoType === 'dash') {
        console.log('🔐 DRM channel detected - processing clearkey...');
        setDrmLoading(true);
        try {
          // Get clearKey from parsed config
          const clearKeyString = parsedDrmConfig.clearKey;
          if (clearKeyString && clearKeyString.trim()) {
            // Parse ClearKey format
            let keyId = clearKeyString;
            let key = clearKeyString;
            if (clearKeyString.includes(':')) {
              const parts = clearKeyString.split(':');
              keyId = parts[0].trim();
              key = parts[1] ? parts[1].trim() : parts[0].trim();
            }
            // Validate keys: must be 32 hex chars for DASH
            const hex32 = /^[0-9a-fA-F]{32}$/;
            if (!hex32.test(keyId) || !hex32.test(key)) {
              setError('DRM ClearKey format invalid. Both KeyID and Key must be 32 hex characters.');
              setLoading(false);
              setDrmLoading(false);
              return;
            }
            source.drm = {
              type: 'clearkey',
              licenseServer: '',
              headers: {},
              clearkey: {
                keyId: keyId,
                key: key,
              },
            };
            console.log('✅ ClearKey DRM config prepared for DASH');
          } else {
            setError('DRM ClearKey is missing. Cannot play this channel.');
            setLoading(false);
            setDrmLoading(false);
            return;
          }
        } catch (drmError) {
          console.error('❌ DRM setup error:', drmError);
          setError('DRM setup error: ' + drmError.message);
          setLoading(false);
          setDrmLoading(false);
          return;
        }
        setDrmLoading(false);
      } else if (hasDRM && videoType !== 'dash') {
        // Warn if DRM is set but not DASH
        setError('DRM ClearKey is only supported for DASH (.mpd) streams.');
        setLoading(false);
        setDrmLoading(false);
        return;
      }

      // Set video source - this triggers the video player
      console.log('✅ Setting video source:', source.uri);
      setVideoSource(source);
      // Don't set loading to false here - wait for onLoad callback
      console.log('✅ Video source set, waiting for player...');
    } catch (err) {
      console.error('❌ Video initialization error:', err);
      setError('Hitilafu ya kuanzisha video');
      setLoading(false);
      setDrmLoading(false);
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

  const handleExit = async () => {
    const watchDuration = Math.floor((Date.now() - watchStartTime.current) / 1000 / 60);
    if (watchDuration > 0) {
      updateWatchDuration(channel.id, watchDuration);
    }

    // Lock channel temporarily if user is not subscribed (paid with points)
    if (!isSubscribed && !channel.isFree) {
      lockChannelTemporarily(channel.id);
      console.log('🔒 Channel temporarily locked after exit (paid with points)');
    }
  };

  const handleLoad = () => {
    console.log('✅ Video loaded successfully');
    console.log('📺 Video is now playing');
    setLoading(false);
    setDrmLoading(false);
  };

  const handleError = (error) => {
    console.error('❌ Video playback error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    let errorMessage = 'Hitilafu ya kucheza video';
    let shouldRetry = false;

    // Check error type and code
    const errorCode = error?.error?.code || error?.code || 'UNKNOWN';
    const errorDomain = error?.error?.domain || error?.domain || '';

    console.log(`Error code: ${errorCode}, domain: ${errorDomain}`);

    if (errorCode.includes('DRM') || errorDomain.includes('DRM')) {
      errorMessage = 'Hitilafu ya usalama wa video. Jaribu tena.';
      shouldRetry = true; // Retry DRM errors
    } else if (errorCode.includes('NETWORK') || errorCode.includes('TIMEOUT')) {
      errorMessage = 'Hitilafu ya mtandao. Hakikisha una muunganisho mzuri.';
      shouldRetry = true;
    } else if (errorCode.includes('DECODER') || errorCode.includes('CODEC')) {
      errorMessage = 'Hitilafu ya decoder. Video haiwezi kuchezwa kwenye kifaa hiki.';
    } else if (errorCode.includes('SOURCE') || errorCode.includes('LOAD')) {
      errorMessage = 'Kituo hakipatikani. Jaribu kituo kingine.';
      shouldRetry = true;
    }

    setError(errorMessage);
    setLoading(false);
    setDrmLoading(false);

    // Auto-retry for recoverable errors
    if (shouldRetry) {
      console.log('🔄 Auto-retrying in 2 seconds...');
      setTimeout(() => {
        console.log('🔄 Retrying video initialization...');
        setError(null);
        initializeVideo();
      }, 2000);
    }
  };

  const getBufferConfig = () => {
    const streamUrl = channel.streamUrl?.toLowerCase() || '';
    const videoType = getVideoType(channel.streamUrl);

    // ULTRA-OPTIMIZED buffer settings for INSTANT playback
    if (channel.drmEnabled || videoType === 'dash') {
      // DRM/DASH channels - minimal buffer for fast startup
      return {
        minBufferMs: 1500,      // Minimum buffer: 1.5 seconds
        maxBufferMs: 15000,     // Maximum buffer: 15 seconds
        bufferForPlaybackMs: 500,   // Start with 500ms buffered
        bufferForPlaybackAfterRebufferMs: 1000,  // Resume after 1s
        cacheSizeMb: 256,
        backBufferDurationMs: 5000, // Keep 5s of played content
      };
    } else if (videoType === 'hls') {
      // HLS channels - ultra fast buffer
      return {
        minBufferMs: 1000,      // Minimum buffer: 1 second
        maxBufferMs: 12000,     // Maximum buffer: 12 seconds
        bufferForPlaybackMs: 300,   // Start with 300ms buffered - INSTANT!
        bufferForPlaybackAfterRebufferMs: 800,   // Resume after 800ms
        cacheSizeMb: 128,
        backBufferDurationMs: 3000,
      };
    } else {
      // MP4/other formats - instant playback
      return {
        minBufferMs: 500,        // Minimum buffer: 500ms
        maxBufferMs: 8000,       // Maximum buffer: 8 seconds
        bufferForPlaybackMs: 200,   // Start with 200ms - ULTRA FAST!
        bufferForPlaybackAfterRebufferMs: 500,   // Resume after 500ms
        cacheSizeMb: 128,
        backBufferDurationMs: 2000,
      };
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

  // Unlock logic removed - handled in HomeScreen before navigation

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

      {/* Video Container with Thumbnail Background */}
      <View style={styles.videoContainerWrapper}>
        {/* Channel Thumbnail Background - shows while video loads */}
        {(loading || drmLoading) && channel.logo && (
          <Image
            source={{ uri: channel.logo }}
            style={[
              isFullscreen ? styles.videoFullscreen : styles.video,
              styles.thumbnailBackground,
            ]}
            resizeMode="cover"
            blurRadius={3}
          />
        )}

        {videoSource ? (
          <Video
            ref={videoRef}
            source={videoSource}
            style={isFullscreen ? styles.videoFullscreen : styles.video}
            paused={paused}
            resizeMode={isFullscreen ? "cover" : "contain"}
            onLoad={handleLoad}
            onError={handleError}
            onLoadStart={() => {
              console.log('📺 Video load started');
              setLoading(true);
            }}
            onBuffer={({ isBuffering }) => {
              console.log('🔄 Buffering:', isBuffering);
              if (!isBuffering && loading) {
                setLoading(false);
              }
            }}
            onProgress={(data) => {
              // Clear loading on first progress - check for actual playback
              if (loading && data.currentTime > 0) {
                console.log('✅ Video playing - clearing loading');
                setLoading(false);
              }
            }}
            onReadyForDisplay={() => {
              // Video is ready to display - clear loading immediately
              console.log('✅ Video ready for display');
              setLoading(false);
              setDrmLoading(false);
            }}
            bufferConfig={getBufferConfig()}
            controls={true}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
            repeat={false}
            fullscreen={isFullscreen}
            onFullscreenPlayerWillPresent={() => {
              Orientation.lockToLandscape();
              setIsFullscreen(true);
            }}
            onFullscreenPlayerWillDismiss={() => {
              Orientation.lockToPortrait();
              setIsFullscreen(false);
            }}
            progressUpdateInterval={100}
            // Additional settings for faster playback
            automaticallyWaitsToMinimizeStalling={false}
            preferredForwardBufferDuration={5}
            maxBitRate={0} // Auto select best quality
            selectedVideoTrack={{ type: 'auto' }}
            selectedAudioTrack={{ type: 'language', value: 'sw' }}
            reportBandwidth={true}
            minLoadRetryCount={3}
            poster={channel.logo} // Show channel logo as poster
            posterResizeMode="cover"
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.noVideoText}>Inaandaa video...</Text>
          </View>
        )}

        {/* Loading Overlay with Thumbnail visible behind */}
        {(loading || drmLoading) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
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
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        disabled={isTransitioning}
      >
        <Icon name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>

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

      {/* Coming Soon Modal */}
      <Modal
        visible={showComingSoonModal}
        transparent
        animationType="fade"
        onRequestClose={() => { }}
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
  videoContainerWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  videoFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  thumbnailBackground: {
    position: 'absolute',
    opacity: 0.5,
    zIndex: 1,
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
    zIndex: 20,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  loadingContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  drmLoadingContainer: {
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
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
    zIndex: 15,
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
