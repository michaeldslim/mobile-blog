import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, fontSize, radius } from '../constants/theme';

export function DeviceContinueBanner() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { isDeviceContinue, lastKnownAccount, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = React.useState(false);

  if (!isDeviceContinue || !lastKnownAccount) return null;

  const name = lastKnownAccount.fullName ?? lastKnownAccount.email ?? 'your account';

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Sign in failed', err?.message ?? 'Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={[styles.banner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <MaterialIcons name="cloud-off" size={18} color={colors.mutedForeground} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.foreground }]}>On-device mode</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Writing as {name}. Sign in to load the feed and publish queued notes.
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }, signingIn && styles.btnDisabled]}
        onPress={handleSignIn}
        disabled={signingIn}
      >
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  body: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  btn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
