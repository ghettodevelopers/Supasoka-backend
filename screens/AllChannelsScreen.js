import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApi } from '../contexts/ApiContext';
import { useAppState } from '../contexts/AppStateContext';

const AllChannelsScreen = ({ navigation }) => {
  const { channels, categories } = useApi();
  const { isSubscribed, hasAdminAccess, isChannelUnlocked } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleChannelPress = (channel) => {
    // Check admin access (highest priority), subscription, free channel, or unlocked with points
    if (hasAdminAccess || isSubscribed || channel.isFree || isChannelUnlocked(channel.id)) {
      navigation.navigate('Player', { channel });
    } else {
      navigation.navigate('Payment');
    }
  };

  // Get channel count for each category
  const getCategoryChannelCount = (categoryName) => {
    if (categoryName === 'All') {
      return channels.length;
    }
    return channels.filter(ch => ch.category === categoryName).length;
  };

  // Get channels for selected category
  const getCategoryChannels = (categoryName) => {
    if (categoryName === 'All') {
      return channels;
    }
    return channels.filter(ch => ch.category === categoryName);
  };

  // Filter channels by search query
  const getFilteredChannels = () => {
    let filtered = selectedCategory ? getCategoryChannels(selectedCategory) : channels;

    if (searchQuery.trim()) {
      filtered = filtered.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredChannels = getFilteredChannels();

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
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.channelGradient}
      >
        <Text style={styles.channelName}>{item.name}</Text>
        <Text style={styles.channelCategory}>{item.category}</Text>
        {item.isFree && (
          <View style={styles.freeBadge}>
            <Icon name="check-circle" size={14} color="#10b981" />
            <Text style={styles.freeBadgeText}>BURE</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render category card
  const renderCategoryCard = ({ item }) => {
    const channelCount = getCategoryChannelCount(item.name);

    // Show all categories, even with 0 channels
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => {
          // Only navigate if there are channels
          if (channelCount > 0) {
            setSelectedCategory(item.name);
          }
        }}
        activeOpacity={channelCount > 0 ? 0.8 : 1}
      >
        <LinearGradient
          colors={channelCount > 0 ? ['#1f2937', '#111827'] : ['#111827', '#0a0e14']}
          style={styles.categoryCardGradient}
        >
          <View style={styles.categoryIconContainer}>
            <LinearGradient
              colors={channelCount > 0 ? ['#3b82f6', '#2563eb'] : ['#374151', '#1f2937']}
              style={styles.categoryIconGradient}
            >
              <Icon name="television" size={32} color={channelCount > 0 ? "#fff" : "#6b7280"} />
            </LinearGradient>
          </View>

          <Text style={[
            styles.categoryCardTitle,
            channelCount === 0 && styles.categoryCardTitleEmpty
          ]}>
            {item.nameSwahili || item.name}
          </Text>

          <View style={[
            styles.categoryCardInfo,
            channelCount === 0 && styles.categoryCardInfoEmpty
          ]}>
            <Icon
              name={channelCount > 0 ? "play-circle" : "clock-outline"}
              size={20}
              color={channelCount > 0 ? "#3b82f6" : "#6b7280"}
            />
            <Text style={[
              styles.categoryCardCount,
              channelCount === 0 && styles.categoryCardCountEmpty
            ]}>
              {channelCount === 0 ? 'Kinakuja' : `${channelCount} ${channelCount === 1 ? 'Kituo' : 'Vituo'}`}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // If category is selected, show channels in that category
  console.log('🔍 Selected category:', selectedCategory);

  if (selectedCategory) {
    console.log('📺 Showing channels for category:', selectedCategory);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedCategory(null)}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {categories.find(c => c.name === selectedCategory)?.nameSwahili || selectedCategory}
          </Text>
          <Text style={styles.headerCount}>
            {filteredChannels.length} {filteredChannels.length === 1 ? 'Kituo' : 'Vituo'}
          </Text>
        </View>

        <ScrollView style={styles.content}>
          <FlatList
            data={filteredChannels}
            renderItem={renderChannel}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.channelRow}
            scrollEnabled={false}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Create all categories including "Vyote" (All)
  const allCategoriesWithAll = [
    { id: 'all', name: 'All', nameSwahili: 'Vyote' },
    ...categories.filter(cat => cat.name !== 'All')
  ];

  console.log('📊 Categories from API:', categories);
  console.log('📊 All categories with Vyote:', allCategoriesWithAll);
  console.log('📊 Total channels:', channels.length);

  // Show category cards
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={24} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tafuta kituo..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={24} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Show search results if searching */}
        {searchQuery.trim() ? (
          <View style={styles.searchResults}>
            <Text style={styles.searchResultsTitle}>
              {filteredChannels.length} Matokeo
            </Text>
            <FlatList
              data={filteredChannels}
              renderItem={renderChannel}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.channelRow}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Icon name="magnify-close" size={64} color="#6b7280" />
                  <Text style={styles.emptySearchText}>
                    Hakuna kituo kilichopatikana
                  </Text>
                </View>
              }
            />
          </View>
        ) : (
          /* Show category cards when not searching */
          <View style={styles.categoriesGrid}>
            <FlatList
              data={allCategoriesWithAll}
              renderItem={renderCategoryCard}
              keyExtractor={(item) => item.id || item.name}
              numColumns={2}
              columnWrapperStyle={styles.categoryRow}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Search Box Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  searchResults: {
    padding: 15,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  headerCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  categoriesContainer: {
    paddingVertical: 15,
    paddingLeft: 20,
    backgroundColor: '#111827',
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
  content: {
    flex: 1,
  },
  channelsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  channelRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  channelCard: {
    width: '48%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
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
    padding: 12,
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  channelCategory: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 4,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  freeBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  // Category Card Styles
  categoriesGrid: {
    padding: 15,
  },
  categoryRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 5,
  },
  categoryCardGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  categoryIconContainer: {
    marginBottom: 15,
  },
  categoryIconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryCardCount: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Empty Category Styles
  categoryCardTitleEmpty: {
    color: '#6b7280',
  },
  categoryCardInfoEmpty: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  categoryCardCountEmpty: {
    color: '#6b7280',
  },
});

export default AllChannelsScreen;
