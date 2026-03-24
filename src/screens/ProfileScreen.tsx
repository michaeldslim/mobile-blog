import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBlogs, flattenBlogPages, useDeleteBlog } from '../hooks/useBlogs';
import { PostCard } from '../components/PostCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Blog, ThemeName } from '../types';
import { spacing, fontSize, radius } from '../constants/theme';
import { themes } from '../constants/theme';
import { ProfileStackParamList } from '../navigation/types';

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileScreen() {
  const { theme, themeName, setTheme, allThemes } = useTheme();
  const { user, isAdmin, session, signOut } = useAuth();
  const navigation = useNavigation<ProfileNavProp>();
  const { colors } = theme;

  const deleteMutation = useDeleteBlog(session?.access_token);

  // My posts — all statuses
  const { data, isLoading, refetch, isRefetching } = useBlogs({
    allStatuses: true,
    authorId: user?.id,
    accessToken: session?.access_token,
  });

  const myPosts = flattenBlogPages(data);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeletePost = (blog: Blog) => {
    Alert.alert('Delete Post', `Delete "${blog.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id: blog.id, imageUrl: blog.imageUrl });
            refetch();
          } catch {
            Alert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  const avatarUri = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'Unknown';

  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + insets.bottom + 8 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarInitial, { color: colors.primaryForeground }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
          {isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.adminText, { color: colors.primaryForeground }]}>⭐ Admin</Text>
            </View>
          )}
        </View>

        {/* Theme Switcher */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Appearance</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {allThemes.map((t) => (
              <TouchableOpacity
                key={t.name}
                style={[
                  styles.themeBtn,
                  { backgroundColor: t.colors.background, borderColor: t.colors.primary },
                  themeName === t.name && styles.themeBtnActive,
                  themeName === t.name && { borderColor: t.colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setTheme(t.name)}
              >
                <View style={[styles.themeSwatchPrimary, { backgroundColor: t.colors.primary }]} />
                <Text
                  style={[
                    styles.themeBtnLabel,
                    { color: t.colors.foreground },
                    themeName === t.name && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>My Posts</Text>
            <TouchableOpacity
              style={[styles.newBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('CreateEditPost', { mode: 'create' })}
            >
              <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>+ New</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingSpinner />
          ) : myPosts.length === 0 ? (
            <EmptyState title="No posts yet" message="Tap '+ New' to write your first post." />
          ) : (
            myPosts.map((blog) => (
              <View key={blog.id} style={styles.myPostItem}>
                <TouchableOpacity
                  style={[styles.myPostCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('PostDetail', { postId: blog.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.myPostRow}>
                    {/* Thumbnail */}
                    {blog.imageUrl ? (
                      <Image source={{ uri: blog.imageUrl }} style={styles.myPostThumb} />
                    ) : (
                      <View style={[styles.myPostThumb, styles.myPostThumbPlaceholder, { backgroundColor: colors.muted }]}>
                        <MaterialIcons name="image-not-supported" size={20} color={colors.mutedForeground} />
                      </View>
                    )}
                    {/* Content */}
                    <View style={styles.myPostContent}>
                      <View style={styles.myPostInfo}>
                        <Text style={[styles.myPostTitle, { color: colors.foreground }]} numberOfLines={2}>
                          {blog.title}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: colors.muted }]}>
                          <Text style={[styles.statusPillText, { color: colors.mutedForeground }]}>
                            {blog.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.myPostActions}>
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('CreateEditPost', { postId: blog.id, mode: 'edit' })
                          }
                          style={[styles.actionBtn, { borderColor: colors.border }]}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeletePost(blog)}
                          style={[styles.actionBtn, styles.deleteBtn, { borderColor: colors.destructive }]}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: colors.destructive }]}
            onPress={handleSignOut}
          >
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  profileCard: {
    margin: spacing.lg,
    padding: spacing['2xl'],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.sm,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
  },
  displayName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  email: {
    fontSize: fontSize.sm,
  },
  adminBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  adminText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  themeBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  themeBtnActive: {
    transform: [{ scale: 1.02 }],
  },
  themeSwatchPrimary: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themeBtnLabel: {
    fontSize: 10,
  },
  newBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  newBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  myPostItem: {
    marginBottom: spacing.sm,
  },
  myPostCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  myPostRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  myPostThumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
  },
  myPostThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPostContent: {
    flex: 1,
    gap: spacing.sm,
  },
  myPostInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  myPostTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  myPostActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  deleteBtn: {},
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  signOutBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
