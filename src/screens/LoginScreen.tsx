import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, fontSize, radius } from '../constants/theme';

export function LoginScreen() {
  const { theme } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const { colors } = theme;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Sign in failed', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
          <Text style={[styles.appName, { color: colors.foreground }]}>The Async Journal</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome back</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            Sign in to create, edit, and manage your posts.
          </Text>

          {/* Google Sign-in Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: colors.primary, borderColor: colors.ring },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleButtonText, { color: colors.primaryForeground }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: radius['2xl'],
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: -spacing.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  googleIcon: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: '#fff',
  },
  googleButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
