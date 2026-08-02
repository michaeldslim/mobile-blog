import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { AUTH_REDIRECT_URI, isAuthRedirectUrl } from '../constants/auth';
import { supabase } from '../lib/supabase';

// Required for expo-web-browser auth session completion (iOS + Android)
WebBrowser.maybeCompleteAuthSession();

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim())
  .filter(Boolean);

/** Parse implicit-flow tokens from the URL hash fragment. */
function parseImplicitTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const atm = url.match(/[#&]access_token=([^&#]+)/);
  const rtm = url.match(/[#&]refresh_token=([^&#]+)/);
  if (atm && rtm) {
    return {
      accessToken: decodeURIComponent(atm[1]),
      refreshToken: decodeURIComponent(rtm[1]),
    };
  }
  return null;
}

/** Extract PKCE authorization code from query string (Supabase default). */
function parseAuthCode(url: string): string | null {
  const match = url.match(/[?&]code=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevents double-calling session exchange within a single sign-in attempt.
  // Both the Linking listener and the WebBrowser result can fire; only the first wins.
  const exchangedRef = useRef(false);

  const handleAuthRedirect = async (url: string) => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    WebBrowser.dismissBrowser();

    if (__DEV__) {
      console.log('[Auth] redirect url:', url.slice(0, 80));
    }

    try {
      const code = parseAuthCode(url);
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return;
      }

      const tokens = parseImplicitTokens(url);
      if (!tokens) {
        if (__DEV__) console.warn('[Auth] Could not parse redirect URL — ignoring');
        exchangedRef.current = false;
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (error) throw error;
    } catch (err) {
      if (__DEV__) console.error('[Auth] session error:', err);
      exchangedRef.current = false;
      throw err;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Cold start: app opened via deep link before listeners were registered
    Linking.getInitialURL().then((url) => {
      if (url && isAuthRedirectUrl(url)) handleAuthRedirect(url);
    });

    // Warm start: deep link while app is in background (common on Android)
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isAuthRedirectUrl(url)) handleAuthRedirect(url);
    });

    return () => {
      subscription.unsubscribe();
      sub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = async () => {
    exchangedRef.current = false;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: AUTH_REDIRECT_URI,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error || !data.url) {
      throw error ?? new Error('Could not generate sign-in URL');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT_URI);

    if (result.type === 'success') {
      await handleAuthRedirect(result.url);
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      exchangedRef.current = false;
    }
    // Android fallback: Linking listener may have already called handleAuthRedirect
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
