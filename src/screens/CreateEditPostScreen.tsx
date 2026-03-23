import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBlog, useCreateBlog, useUpdateBlog } from '../hooks/useBlogs';
import { pickAndCompressImage, uploadBlogImage } from '../lib/imageUpload';
import { BlogStatus } from '../types';
import { spacing, fontSize, radius } from '../constants/theme';
import { FeedStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FeedStackParamList, 'CreateEditPost'>;

export function CreateEditPostScreen({ route, navigation }: Props) {
  const { mode, postId } = route.params;
  const { theme } = useTheme();
  const { session, user } = useAuth();
  const { colors } = theme;
  const isEdit = mode === 'edit';

  // Fetch existing post for edit mode
  const { data: existingBlog } = useBlog(postId ?? '', session?.access_token);

  const createMutation = useCreateBlog(session?.access_token);
  const updateMutation = useUpdateBlog(session?.access_token);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<BlogStatus>('published');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEdit && existingBlog) {
      setTitle(existingBlog.title);
      setContent(existingBlog.content);
      setTags(existingBlog.tags ?? []);
      setStatus(existingBlog.status);
      setImageUrl(existingBlog.imageUrl ?? null);
    }
  }, [isEdit, existingBlog]);

  // ─── Image Picker ───────────────────────────────────────────────────────────

  const handlePickImage = async () => {
    try {
      const compressed = await pickAndCompressImage();
      if (!compressed) return;
      setImageUri(compressed.uri);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not pick image');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setImageUrl(null);
  };

  // ─── Tags ───────────────────────────────────────────────────────────────────

  const handleTagInput = (text: string) => {
    if (text.endsWith(',') || text.endsWith('\n')) {
      const newTag = text.replace(/[,\n]/g, '').trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag]);
      }
      setTagInput('');
    } else {
      setTagInput(text);
    }
  };

  const handleTagInputSubmit = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags((prev) => [...prev, newTag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Post title is required.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Post content is required.');
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl;

      // Upload new image if one was picked
      if (imageUri) {
        setIsUploadingImage(true);
        finalImageUrl = await uploadBlogImage(imageUri);
        setIsUploadingImage(false);
      } else if (imageUri === null && isEdit) {
        // Image was explicitly removed
        finalImageUrl = null;
      }

      const pendingTags = tagInput.trim()
        ? [...tags, tagInput.trim().toLowerCase()]
        : tags;

      if (isEdit && postId) {
        await updateMutation.mutateAsync({
          id: postId,
          input: {
            title: title.trim(),
            content: content.trim(),
            tags: pendingTags,
            status,
            imageUrl: finalImageUrl,
          },
          oldImageUrl: existingBlog?.imageUrl,
        });
        Alert.alert('Updated', 'Post updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          content: content.trim(),
          tags: pendingTags,
          status,
          imageUrl: finalImageUrl,
          authorId: user?.id,
          authorName: user?.user_metadata?.full_name ?? user?.email ?? undefined,
        });
        Alert.alert('Published', 'Post created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      setIsUploadingImage(false);
      Alert.alert('Error', err?.message ?? 'Failed to save post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayImage = imageUri || imageUrl;
  const isBusy = isSaving || isUploadingImage;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Nav Bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={isBusy}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          {isEdit ? 'Edit Post' : 'New Post'}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isBusy}
          style={[styles.saveBtn, { backgroundColor: colors.primary }, isBusy && styles.disabled]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              {isEdit ? 'Update' : 'Publish'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Title *</Text>
            <TextInput
              style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              placeholder="Post title..."
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              multiline={false}
            />
          </View>

          {/* Body */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Content * (Markdown supported)
            </Text>
            <TextInput
              style={[
                styles.bodyInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Write your post here..."
              placeholderTextColor={colors.mutedForeground}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Image */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Header Image</Text>
            {displayImage ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: displayImage }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}
                  onPress={handleRemoveImage}
                >
                  <Text style={styles.removeImageText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imagePickerBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={handlePickImage}
              >
                <Text style={{ fontSize: 24 }}>📷</Text>
                <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>
                  Tap to add an image
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tags */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Tags (press Enter or comma to add)
            </Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, { backgroundColor: colors.primary }]}
                  onPress={() => removeTag(tag)}
                >
                  <Text style={[styles.tagChipText, { color: colors.primaryForeground }]}>
                    #{tag} ✕
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[
                  styles.tagInput,
                  { color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="Add tag..."
                placeholderTextColor={colors.mutedForeground}
                value={tagInput}
                onChangeText={handleTagInput}
                onSubmitEditing={handleTagInputSubmit}
                returnKeyType="done"
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Status Toggle */}
          <View style={[styles.field, styles.statusRow]}>
            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
              <Text style={[styles.statusHint, { color: colors.foreground }]}>
                {status === 'published' ? '🌍 Published' : '🔒 Draft'}
              </Text>
            </View>
            <Switch
              value={status === 'published'}
              onValueChange={(val) => setStatus(val ? 'published' : 'draft')}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  cancelText: {
    fontSize: fontSize.base,
  },
  navTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  bodyInput: {
    fontSize: fontSize.base,
    lineHeight: 24,
    minHeight: 240,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  imagePickerBtn: {
    height: 140,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed' as any,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  imagePickerText: {
    fontSize: fontSize.sm,
  },
  imagePreviewWrapper: {
    gap: spacing.sm,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: radius.xl,
  },
  removeImageBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  removeImageText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  tagChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  tagInput: {
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 120,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHint: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
