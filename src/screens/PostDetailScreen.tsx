import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBlog, useDeleteBlog, useLikeBlog, useVote } from '../hooks/useBlogs';
import { MarkdownContent } from '../components/MarkdownContent';
import { TagPill } from '../components/TagPill';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { spacing, fontSize, radius } from '../constants/theme';
import { FeedStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FeedStackParamList, 'PostDetail'>;

export function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { theme } = useTheme();
  const { session, user, isAdmin } = useAuth();
  const { colors } = theme;

  const { data: blog, isLoading, error } = useBlog(postId, session?.access_token);
  const deleteMutation = useDeleteBlog(session?.access_token);
  const likeMutation = useLikeBlog(session?.access_token);
  const { data: userVote } = useVote(postId);

  const [lightboxVisible, setLightboxVisible] = useState(false);

  const isOwner = !!user && !!blog && (blog.authorId === user.id || isAdmin);

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync({
                id: postId,
                imageUrl: blog?.imageUrl,
              });
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!blog) return;
    try {
      const imageHtml = blog.imageUrl
        ? `<img src="${blog.imageUrl}" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:24px;" />`
        : '';

      const tagsHtml = blog.tags.length > 0
        ? `<p style="margin-top:24px;">${blog.tags.map(t =>
            `<span style="display:inline-block;background:#e2e8f0;border-radius:12px;padding:3px 10px;font-size:12px;margin-right:6px;color:#475569;">#${t}</span>`
          ).join('')}</p>`
        : '';

      const contentHtml = blog.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
              h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
              .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
              .content { font-size: 16px; white-space: pre-wrap; }
              .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>${blog.title}</h1>
            <p class="meta">${blog.authorName ? `by ${blog.authorName} &nbsp;&middot;&nbsp; ` : ''}${formattedDate}</p>
            ${imageHtml}
            <div class="content">${contentHtml}</div>
            ${tagsHtml}
            <p class="footer">The Async Journal</p>
          </body>
        </html>`;

      await Print.printAsync({ html });
    } catch {
      // User cancelled or print unavailable
    }
  };

  const handleLike = () => {
    if (!blog) return;
    likeMutation.mutate({ blog, action: 'like' });
  };

  const handleDislike = () => {
    if (!blog) return;
    likeMutation.mutate({ blog, action: 'dislike' });
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (error || !blog) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          Post not found or failed to load.
        </Text>
      </SafeAreaView>
    );
  }

  const formattedDate = (() => {
    try {
      return format(new Date(blog.createdAt), 'MMMM d, yyyy');
    } catch {
      return '';
    }
  })();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Custom nav header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.navActions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <MaterialIcons name="share" size={22} color={colors.foreground} />
          </TouchableOpacity>
          {isOwner && (
            <>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('CreateEditPost', { postId: blog.id, mode: 'edit' })
                }
                style={[styles.editBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.deleteBtn, { backgroundColor: colors.destructive }]}
                disabled={deleteMutation.isPending}
              >
                <Text style={[styles.deleteBtnText]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.article}>
          {/* Status badge for non-published */}
          {blog.status !== 'published' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                {blog.status.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>{blog.title}</Text>

          {/* Body */}
          <MarkdownContent content={blog.content} />

          {/* Image */}
          {blog.imageUrl && (
            <TouchableOpacity onPress={() => setLightboxVisible(true)} activeOpacity={0.9}>
              <Image
                source={{ uri: blog.imageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Tags */}
          {blog.tags.length > 0 && (
            <View style={styles.tags}>
              {blog.tags.map((tag) => (
                <TagPill key={tag} tag={tag} small />
              ))}
            </View>
          )}

          {/* Date / Meta */}
          <View style={styles.meta}>
            {blog.authorName && (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                by {blog.authorName}
              </Text>
            )}
            {formattedDate ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formattedDate}
              </Text>
            ) : null}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Like / Dislike */}
          <View style={styles.reactions}>
            <TouchableOpacity
              style={[
                styles.reactionBtn,
                { borderColor: colors.border },
                userVote === 'like'
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.secondary },
              ]}
              onPress={handleLike}
              activeOpacity={0.75}
              disabled={likeMutation.isPending}
            >
              <Text style={styles.reactionIcon}>👍</Text>
              <Text style={[styles.reactionCount, { color: userVote === 'like' ? colors.primaryForeground : colors.foreground }]}>
                {blog.likesCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.reactionBtn,
                { borderColor: colors.border },
                userVote === 'dislike'
                  ? { backgroundColor: colors.destructive }
                  : { backgroundColor: colors.secondary },
              ]}
              onPress={handleDislike}
              activeOpacity={0.75}
              disabled={likeMutation.isPending}
            >
              <Text style={styles.reactionIcon}>👎</Text>
              <Text style={[styles.reactionCount, { color: userVote === 'dislike' ? colors.destructiveForeground : colors.foreground }]}>
                {blog.dislikesCount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Image Lightbox */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <TouchableOpacity
          style={styles.lightboxOverlay}
          onPress={() => setLightboxVisible(false)}
          activeOpacity={1}
        >
          <Image
            source={{ uri: blog.imageUrl! }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  deleteBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  heroImage: {
    width: '100%',
    height: 260,
    borderRadius: radius.lg,
  },
  article: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: fontSize.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  reactions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  reactionIcon: {
    fontSize: 20,
  },
  reactionCount: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  errorText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    margin: spacing['2xl'],
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
});
