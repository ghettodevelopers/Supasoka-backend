import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import { useApi } from '../contexts/ApiContext';
import { useAppState } from '../contexts/AppStateContext';
import { useNotifications } from '../contexts/NotificationContext';
import UnlockModal from '../components/UnlockModal';
import SubscriptionGrantModal from '../components/SubscriptionGrantModal';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { channels, carouselImages, categories, loading, refreshData, getFreeChannels } = useApi();
  const {
    isSubscribed,
    hasAdminAccess,
    isChannelUnlocked,
    points,
    spendPoints,
    unlockChannelTemporarily,
  } = useAppState();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantedTime, setGrantedTime] = useState(0);
  const carouselRef = React.useRef(null);
  const modalSlideAnim = React.useRef(new Animated.Value(0)).current;
  const offlineModalAnim = React.useRef(new Animated.Value(0)).current;
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  // Network detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);

      if (!online && !showOfflineModal) {
        setShowOfflineModal(true);
        Animated.spring(offlineModalAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();
      } else if (online && showOfflineModal) {
        closeOfflineModal();
      }
    });

    return () => unsubscribe();
  }, [showOfflineModal]);

  // Shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Set up global refresh function and subscription grant modal
  useEffect(() => {
    global.refreshChannels = refreshData;
    global.refreshCarousel = refreshData;
    
    // Set up global function to show subscription grant modal
    global.showSubscriptionGrantModal = (timeInMinutes) => {
      console.log('🎉 Showing subscription grant modal:', timeInMinutes);
      setGrantedTime(timeInMinutes);
      setShowGrantModal(true);
    };
    
    return () => {
      delete global.showSubscriptionGrantModal;
    };
  }, []);

  // Debug: Log carousel images whenever they change
  useEffect(() => {
    console.log('🔍 HomeScreen: Carousel images changed!');
    console.log('📊 Total carousel images:', carouselImages?.length || 0);
    if (carouselImages && carouselImages.length > 0) {
      carouselImages.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.title || 'No title'} - ${img.imageUrl}`);
      });
    } else {
      console.log('   ⚠️ No carousel images available');
    }
  }, [carouselImages]);

  // Auto-slide carousel every 3 seconds
  useEffect(() => {
    if (!carouselImages || carouselImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentCarouselIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % carouselImages.length;

        // Scroll to next item
        if (carouselRef.current) {
          carouselRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        }

        return nextIndex;
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [carouselImages]);

  const onRefresh = async () => {
    if (!isOnline) {
      setShowOfflineModal(true);
      Animated.spring(offlineModalAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
      return;
    }

    console.log('🔄 User initiated refresh - Updating all data...');
    setRefreshing(true);

    try {
      // Refresh all data from AdminSupa and backend
      await refreshData();

      // Reset carousel to first slide
      setCurrentCarouselIndex(0);
      if (carouselRef.current) {
        carouselRef.current.scrollToIndex({ index: 0, animated: true });
      }

      console.log('✅ Refresh complete - All data updated!');
      console.log(`📺 Channels: ${channels.length}`);
      console.log(`🎬 Carousel: ${carouselImages.length} images`);
      console.log(`🏷️ Categories: ${categories.length}`);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const closeOfflineModal = () => {
    Animated.timing(offlineModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowOfflineModal(false);
    });
  };

  const retryConnection = async () => {
    console.log('🔄 Checking connection...');
    const state = await NetInfo.fetch();
    const online = state.isConnected && state.isInternetReachable !== false;

    if (online) {
      console.log('✅ Connection restored - Refreshing all data...');
      closeOfflineModal();
      setRefreshing(true);

      try {
        // Refresh all data from AdminSupa and backend
        await refreshData();

        // Reset carousel to first slide
        setCurrentCarouselIndex(0);
        if (carouselRef.current) {
          carouselRef.current.scrollToIndex({ index: 0, animated: true });
        }

        console.log('✅ All data refreshed successfully!');
      } catch (error) {
        console.error('❌ Refresh failed:', error);
      } finally {
        setRefreshing(false);
      }
    } else {
      console.log('❌ Still offline');
    }
  };

  const handleChannelPress = async (channel) => {
    // Check admin access (highest priority), subscription, or free channel, or unlocked with points
    if (hasAdminAccess || isSubscribed || channel.isFree || isChannelUnlocked(channel.id)) {
      navigation.navigate('Player', { channel });
      return;
    }

    // Show unlock modal for unsubscribed users
    setSelectedChannel(channel);
    setShowUnlockModal(true);
    Animated.spring(modalSlideAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeUnlockModal = () => {
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUnlockModal(false);
      setSelectedChannel(null);
    });
  };

  const handlePayment = () => {
    closeUnlockModal();
    navigation.navigate('Payment');
  };

  const handleWatchFree = async () => {
    const REQUIRED_POINTS = 120;

    if (points < REQUIRED_POINTS) {
      // Not enough points - navigate to profile to watch ads
      closeUnlockModal();
      setTimeout(() => {
        navigation.navigate('UserAccount', { scrollToPoints: true });
      }, 300);
      return;
    }

    // Deduct points and unlock channel TEMPORARILY (not persisted)
    setIsUnlocking(true);
    try {
      const success = await spendPoints(REQUIRED_POINTS, `Fungua ${selectedChannel.name}`);
      if (success) {
        unlockChannelTemporarily(selectedChannel.id);
        console.log(`✅ Channel unlocked temporarily with ${REQUIRED_POINTS} points`);
        closeUnlockModal();
        setTimeout(() => {
          navigation.navigate('Player', { channel: selectedChannel });
        }, 300);
      } else {
        console.error('❌ Failed to spend points');
      }
    } catch (error) {
      console.error('Error unlocking channel:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  const filteredChannels = selectedCategory === 'All'
    ? channels
    : channels.filter(ch => ch.category === selectedCategory);

  const freeChannels = getFreeChannels();

  const renderCarousel = () => {
    console.log('🎨 Rendering carousel with', carouselImages?.length || 0, 'images');

    if (!carouselImages || carouselImages.length === 0) {
      console.log('⚠️ No carousel images to display');
      return null;
    }

    console.log('✅ Displaying carousel with images:', carouselImages.map(img => img.title || img.imageUrl).join(', '));

    return (
      <View style={styles.carouselContainer}>
        <FlatList
          ref={carouselRef}
          data={carouselImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              carouselRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentCarouselIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={styles.carouselSlide}>
              <Image
                source={{ uri: item.imageUrl || item.image }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
              {item.title && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.carouselOverlay}
                >
                  <Text style={styles.carouselTitle}>{item.title}</Text>
                </LinearGradient>
              )}
            </View>
          )}
        />
        {/* Carousel indicators */}
        <View style={styles.carouselIndicators}>
          {carouselImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentCarouselIndex && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderChannel = ({ item }) => (
    <TouchableOpacity
      style={styles.channelCard}
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.logo }}
        style={styles.channelLogo}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.channelGradient}
      >
        <Text style={styles.channelName}>{item.name}</Text>
        {item.isFree && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>BURE</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Shimmer Loading Component
  const ShimmerBox = ({ width: boxWidth, height, style }) => {
    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-boxWidth, boxWidth],
    });

    return (
      <View style={[{ width: boxWidth, height, backgroundColor: '#1f2937', borderRadius: 12, overflow: 'hidden' }, style]}>
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX }],
          }}
        >
          <LinearGradient
            colors={['#1f2937', '#374151', '#1f2937']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    );
  };

  if (loading && channels.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header Shimmer */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <ShimmerBox width={120} height={30} />
            <ShimmerBox width={40} height={40} style={{ borderRadius: 20 }} />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Carousel Shimmer */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <ShimmerBox width={width - 40} height={200} />
          </View>

          {/* Categories Shimmer */}
          <View style={{ paddingHorizontal: 20, paddingTop: 25 }}>
            <ShimmerBox width={150} height={24} style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ShimmerBox width={80} height={40} style={{ borderRadius: 20 }} />
              <ShimmerBox width={100} height={40} style={{ borderRadius: 20 }} />
              <ShimmerBox width={90} height={40} style={{ borderRadius: 20 }} />
            </View>
          </View>

          {/* Channels Shimmer */}
          <View style={{ paddingHorizontal: 20, paddingTop: 25 }}>
            <ShimmerBox width={120} height={24} style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <View key={item} style={{ width: (width - 55) / 2 }}>
                  <ShimmerBox width={(width - 55) / 2} height={120} style={{ marginBottom: 10 }} />
                  <ShimmerBox width={(width - 55) / 2 - 20} height={16} style={{ marginBottom: 5 }} />
                  <ShimmerBox width={60} height={12} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dark navbar with black text */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Supasoka</Text>
          <View style={styles.headerRight}>
            {/* Notification Bell */}
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderCarousel()}

        {/* Free Channels Section - Full Width */}
        {freeChannels.length > 0 && (
          <View style={styles.freeChannelsSection}>
            <View style={styles.sectionHeader}>
              <Icon name="star-circle" size={24} color="#10b981" />
              <Text style={styles.freeChannelsTitle}>Channel ya Bure</Text>
              <View style={styles.freeBadgeSmall}>
                <Text style={styles.freeBadgeSmallText}>BURE</Text>
              </View>
            </View>
            <View style={styles.freeChannelsGrid}>
              {freeChannels.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.freeChannelCardNew}
                  onPress={() => handleChannelPress(item)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: item.logo }}
                    style={styles.freeChannelLogoNew}
                    resizeMode="cover"
                  />
                  <View style={styles.freeChannelInfo}>
                    <Text style={styles.freeChannelNameNew} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.freeTagNew}>
                      <Icon name="check-circle" size={14} color="#10b981" />
                      <Text style={styles.freeTagTextNew}>Bure Kabisa</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* All Categories - Comprehensive List */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Aina za Vituo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Always show these categories */}
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'All' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'All' && styles.categoryTextActive,
                ]}
              >
                Vituo Vyote
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Sports' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Sports')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Sports' && styles.categoryTextActive,
                ]}
              >
                Michezo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Movies' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Movies')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Movies' && styles.categoryTextActive,
                ]}
              >
                Movies
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Drama' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Drama')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Drama' && styles.categoryTextActive,
                ]}
              >
                Tamthilia
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Wildlife' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Wildlife')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Wildlife' && styles.categoryTextActive,
                ]}
              >
                Wanyama
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Kids' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Kids')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Kids' && styles.categoryTextActive,
                ]}
              >
                Watoto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Religious' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Religious')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Religious' && styles.categoryTextActive,
                ]}
              >
                Dini
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Discovery' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Discovery')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Discovery' && styles.categoryTextActive,
                ]}
              >
                Gundua
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Documentary' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Documentary')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Documentary' && styles.categoryTextActive,
                ]}
              >
                Documentary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'News' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('News')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'News' && styles.categoryTextActive,
                ]}
              >
                Habari
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Entertainment' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Entertainment')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Entertainment' && styles.categoryTextActive,
                ]}
              >
                Burudani
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'Music' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('Music')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'Music' && styles.categoryTextActive,
                ]}
              >
                Muziki
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.channelsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'All' ? 'Vituo Vyote' : selectedCategory}
          </Text>
          {filteredChannels.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="television-off" size={80} color="#4b5563" />
              <Text style={styles.emptyStateTitle}>Hakuna Vituo</Text>
              <Text style={styles.emptyStateText}>Vituo zaidi vinakuja hivi karibuni</Text>
            </View>
          ) : (
            <FlatList
              data={filteredChannels}
              renderItem={renderChannel}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.channelRow}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Channel Unlock Modal */}
      <UnlockModal
        visible={showUnlockModal}
        onClose={closeUnlockModal}
        onPayment={handlePayment}
        onPoints={handleWatchFree}
        points={points}
        requiredPoints={120}
      />

      {/* Subscription Grant Modal */}
      <SubscriptionGrantModal
        visible={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        grantedTime={grantedTime}
      />

      {/* Offline Modal */}
      <Modal
        visible={showOfflineModal}
        transparent
        animationType="fade"
        onRequestClose={closeOfflineModal}
      >
        <View style={styles.offlineModalOverlay}>
          <Animated.View
            style={[
              styles.offlineModalContent,
              {
                transform: [{ scale: offlineModalAnim }],
              },
            ]}
          >
            {/* Offline Icon */}
            <View style={styles.offlineIconContainer}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.offlineIconGradient}
              >
                <Icon name="wifi-off" size={70} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.offlineTitle}>Hakuna Mtandao</Text>

            {/* Message */}
            <Text style={styles.offlineMessage}>
              Samahani, huna muunganisho wa intaneti.
            </Text>

            <Text style={styles.offlineSubMessage}>
              Programu hii inahitaji mtandao wa intaneti ili kufanya kazi.
            </Text>

            {/* Info Box */}
            <View style={styles.offlineInfoBox}>
              <Icon name="information" size={24} color="#3b82f6" />
              <Text style={styles.offlineInfoText}>
                Tafadhali washa data au WiFi yako na ujaribu tena.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.offlineButtons}>
              <TouchableOpacity
                style={styles.offlineRetryButton}
                onPress={retryConnection}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.offlineRetryGradient}
                >
                  <Icon name="refresh" size={24} color="#fff" />
                  <Text style={styles.offlineRetryText}>Jaribu Tena</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.offlineCloseButton}
                onPress={closeOfflineModal}
              >
                <Text style={styles.offlineCloseText}>Sawa</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#b30404ff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  profileButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  carouselContainer: {
    height: 200,
    marginBottom: 20,
    position: 'relative',
  },
  carouselSlide: {
    width: width,
    height: 200,
    position: 'relative',
  },
  carouselImage: {
    width: width,
    height: 200,
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#3b82f6',
    width: 24,
  },
  freeChannelsSection: {
    paddingVertical: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#10b981',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  freeChannelsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
    flex: 1,
  },
  freeBadgeSmall: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeSmallText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  freeChannelsGrid: {
    paddingHorizontal: 20,
  },
  freeChannelCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#10b981',
    height: 80,
  },
  freeChannelLogoNew: {
    width: 100,
    height: 80,
  },
  freeChannelInfo: {
    flex: 1,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeChannelNameNew: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  freeTagNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeTagTextNew: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  categoriesContainer: {
    paddingVertical: 15,
    paddingLeft: 20,
    backgroundColor: '#000',
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
  },
  categoryText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  channelsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  channelRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  channelCard: {
    width: (width - 60) / 2,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  channelLogo: {
    width: '100%',
    height: '100%',
  },
  channelGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  freeBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  unlockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  unlockModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
  },
  unlockModalHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  unlockModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  unlockModalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  unlockModalButtons: {
    gap: 15,
    marginBottom: 15,
  },
  unlockPayButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  unlockFreeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  unlockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  unlockButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 5,
  },
  pointsBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  unlockCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  unlockCancelText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  // Offline Modal Styles
  offlineModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offlineModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  offlineIconContainer: {
    marginBottom: 25,
  },
  offlineIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  offlineMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  offlineSubMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  offlineInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    gap: 15,
  },
  offlineInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#3b82f6',
    lineHeight: 20,
  },
  offlineButtons: {
    width: '100%',
    gap: 12,
  },
  offlineRetryButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  offlineRetryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  offlineRetryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  offlineCloseButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  offlineCloseText: {
    fontSize: 16,
    color: '#9ca3af',
  },
};

export default HomeScreen;
