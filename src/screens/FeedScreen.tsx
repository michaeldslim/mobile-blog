import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBlogs, flattenBlogPages } from '../hooks/useBlogs';
import { PostCard } from '../components/PostCard';
import { TagPill } from '../components/TagPill';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { Blog } from '../types';
import { spacing, fontSize, radius } from '../constants/theme';
import { FeedStackParamList } from '../navigation/types';

type FeedNavProp = NativeStackNavigationProp<FeedStackParamList>;

export function FeedScreen() {
  const { theme } = useTheme();
  const { session, user } = useAuth();
  const navigation = useNavigation<FeedNavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | undefined>();

  // Debounce search input
  const searchTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useBlogs({
    search: debouncedSearch || undefined,
    tag: activeTag,
    accessToken: session?.access_token,
  });

  const blogs = flattenBlogPages(data);

  const handleTagPress = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? undefined : tag));
  }, []);

  const handleClearTag = () => setActiveTag(undefined);

  const renderItem = useCallback(
    ({ item }: { item: Blog }) => (
      <PostCard
        blog={item}
        onPress={(b) => navigation.navigate('PostDetail', { postId: b.id })}
        onTagPress={handleTagPress}
      />
    ),
    [navigation, handleTagPress]
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return <LoadingSpinner size="small" />;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>The Async Journal</Text>
        {user && (
          <TouchableOpacity
            style={[styles.newPostBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CreateEditPost', { mode: 'create' })}
            activeOpacity={0.8}
          >
            <Text style={[styles.newPostText, { color: colors.primaryForeground }]}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar — hidden when there are no posts and no active filter */}
      {(isLoading || blogs.length > 0 || !!debouncedSearch || !!activeTag) && (
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search posts..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      )}

      {/* Active tag filter */}
      {activeTag && (
        <View style={[styles.tagFilterRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tagFilterLabel, { color: colors.mutedForeground }]}>Tag:</Text>
          <TagPill tag={activeTag} active />
          <TouchableOpacity onPress={handleClearTag} style={styles.clearTag}>
            <Text style={[styles.clearTagText, { color: colors.mutedForeground }]}>✕ Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              title={debouncedSearch || activeTag ? 'No results' : 'No posts yet'}
              message={
                debouncedSearch
                  ? `No posts matched "${debouncedSearch}"`
                  : activeTag
                  ? `No posts tagged #${activeTag}`
                  : 'Be the first to write something!'
              }
            />
          }
          ListFooterComponent={renderFooter}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + insets.bottom + 8 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newPostBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
  },
  newPostText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  tagFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagFilterLabel: {
    fontSize: fontSize.sm,
  },
  clearTag: {
    marginLeft: spacing.xs,
  },
  clearTagText: {
    fontSize: fontSize.sm,
  },
  listContent: {
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
});
