import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { format } from 'date-fns';
import { Blog } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, fontSize } from '../constants/theme';
import { TagPill } from './TagPill';

interface PostCardProps {
  blog: Blog;
  onPress: (blog: Blog) => void;
  onTagPress?: (tag: string) => void;
}

export function PostCard({ blog, onPress, onTagPress }: PostCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const formattedDate = React.useMemo(() => {
    try {
      return format(new Date(blog.createdAt), 'MMM d, yyyy');
    } catch {
      return '';
    }
  }, [blog.createdAt]);

  const readingTime = React.useMemo(() => {
    const words = blog.content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [blog.content]);

  // Truncate content for preview (strip potential markdown)
  const preview = blog.content
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/[#*_`>~\-]/g, '')
    .slice(0, 160)
    .trim();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(blog)}
      activeOpacity={0.75}
    >
      <View style={styles.body}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {blog.title}
        </Text>

        {/* Preview */}
        {preview ? (
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={3}>
            {preview}
          </Text>
        ) : null}

        {/* Image */}
        {blog.imageUrl && (
          <Image
            source={{ uri: blog.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* Tags */}
        {blog.tags.length > 0 && (
          <View style={styles.tags}>
            {blog.tags.slice(0, 4).map((tag) => (
              <TagPill
                key={tag}
                tag={tag}
                onPress={onTagPress}
                small
              />
            ))}
          </View>
        )}

        {/* Footer: author + date + likes */}
        <View style={styles.footer}>
          <View style={styles.meta}>
            {blog.authorName && (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {blog.authorName}
              </Text>
            )}
            {blog.authorName && formattedDate && (
              <Text style={[styles.separator, { color: colors.border }]}>·</Text>
            )}
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formattedDate}
            </Text>
            <Text style={[styles.separator, { color: colors.border }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {readingTime} min read
            </Text>
          </View>

          <View style={styles.likes}>
            <Text style={[styles.likeText, { color: colors.mutedForeground }]}>
              👍 {blog.likesCount}
            </Text>
            <Text style={[styles.likeText, { color: colors.mutedForeground }]}>
              👎 {blog.dislikesCount}
            </Text>
          </View>
        </View>

        {/* Draft badge */}
        {blog.status !== 'published' && (
          <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {blog.status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  image: {
    height: 140,
    borderRadius: radius.lg,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    lineHeight: 24,
  },
  preview: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'column',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: fontSize.xs,
  },
  separator: {
    fontSize: fontSize.sm,
    marginHorizontal: 2,
  },
  likes: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  likeText: {
    fontSize: fontSize.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
