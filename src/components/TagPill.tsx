import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, fontSize } from '../constants/theme';

interface TagPillProps {
  tag: string;
  active?: boolean;
  small?: boolean;
  onPress?: (tag: string) => void;
}

export function TagPill({ tag, active, small, onPress }: TagPillProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const backgroundColor = active ? colors.primary : colors.secondary;
  const textColor = active ? colors.primaryForeground : colors.mutedForeground;

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        small && styles.pillSmall,
        { backgroundColor, borderColor: colors.border },
      ]}
      onPress={onPress ? () => onPress(tag) : undefined}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[styles.text, small && styles.textSmall, { color: textColor }]}>
        #{tag}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  pillSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: fontSize.xs,
  },
});
