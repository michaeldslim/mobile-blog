import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { registerPushToken, unregisterPushToken } from '../lib/notifications';

// Required for expo-web-browser auth session completion (iOS + Android)
WebBrowser.maybeCompleteAuthSession();

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim())
  .filter(Boolean);

const REDIRECT_URI = 'mobile-blog://auth/callback';

/** Parse a Supabase OAuth implicit-flow redirect URL.
 * Extracts access_token and refresh_token from the hash fragment.
 */
function parseRedirect(url: string): { accessToken: string; refreshToken: string } | null {
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

  // Prevents double-calling exchangeCodeForSession within a single sign-in attempt.
  // Both the Linking listener and the WebBrowser result can fire; only the first wins.
  const exchangedRef = useRef(false);

  const exchangeCode = async (url: string) => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    WebBrowser.dismissBrowser();

    const parsed = parseRedirect(url);
    console.log('[Auth] redirect url:', url.slice(0, 60));

    if (!parsed) {
      console.warn('[Auth] Could not parse redirect URL — ignoring');
      exchangedRef.current = false;
      return;
    }

    // Implicit flow: tokens are in the URL directly
    const { error } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (error) {
      console.error('[Auth] setSession error:', error.message);
      exchangedRef.current = false;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        registerPushToken(newSession.user.id).catch((err) =>
          console.error('[Push] registerPushToken failed:', err)
        );
      }
    });

    // Android: fires when the deep link brings the app to foreground during auth
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith('mobile-blog://')) exchangeCode(url);
    });

    return () => {
      subscription.unsubscribe();
      sub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = async () => {
    exchangedRef.current = false; // Reset for a fresh sign-in attempt

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URI,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account', // always show account picker after sign-out
        },
      },
    });

    if (error || !data.url) {
      throw error ?? new Error('Could not generate sign-in URL');
    }

    // Chrome Custom Tab keeps the JS context alive, so the PKCE code verifier
    // that signInWithOAuth stored in memory survives until exchangeCodeForSession
    // is called — unlike Linking.openURL which puts the app in background where
    // the process can be killed and the verifier lost.
    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI);

    // iOS (and some Android builds): Custom Tab intercepted the redirect directly
    if (result.type === 'success') {
      await exchangeCode(result.url);
    }
    // Android fallback: the Linking 'url' listener fired during openAuthSessionAsync
    // and already called exchangeCode. No extra work needed here.
  };

  const signOut = async () => {
    if (session?.user?.id) {
      await unregisterPushToken(session.user.id).catch((err) =>
        console.error('[Push] unregisterPushToken failed:', err)
      );
    }
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
