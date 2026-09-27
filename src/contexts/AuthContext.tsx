import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { AUTH_POLICY, AUTH_REDIRECT_URI, isAuthRedirectUrl } from '../constants/auth';
import { checkOnline } from '../lib/networkStatus';
import {
  clearLastKnownAccount,
  EffectiveUser,
  lastKnownToEffectiveUser,
  LastKnownAccount,
  loadDeviceContinueActive,
  loadLastKnownAccount,
  saveLastKnownAccount,
  setDeviceContinueActive,
  userToLastKnownAccount,
} from '../lib/lastKnownAccount';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim())
  .filter(Boolean);

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

function parseAuthCode(url: string): string | null {
  const match = url.match(/[?&]code=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export type AuthMode = 'full' | 'device_continue' | 'signed_out';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  effectiveUser: EffectiveUser | null;
  lastKnownAccount: LastKnownAccount | null;
  authMode: AuthMode;
  isDeviceContinue: boolean;
  canUseApp: boolean;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  enterDeviceContinue: () => Promise<void>;
  leaveDeviceContinue: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSessionUser(user: User) {
  await saveLastKnownAccount(userToLastKnownAccount(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [lastKnownAccount, setLastKnownAccount] = useState<LastKnownAccount | null>(null);
  const [isDeviceContinue, setIsDeviceContinue] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const tryRefreshSession = useCallback(async () => {
    const online = await checkOnline();
    if (!online) return;

    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (__DEV__) console.warn('[Auth] refreshSession:', error.message);
      return;
    }
    if (data.session) {
      setSession(data.session);
      await persistSessionUser(data.session.user);
      await setDeviceContinueActive(false);
      setIsDeviceContinue(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [sessionResult, cachedAccount, deviceContinueFlag] = await Promise.all([
        supabase.auth.getSession(),
        loadLastKnownAccount(),
        loadDeviceContinueActive(),
      ]);

      if (cancelled) return;

      const initialSession = sessionResult.data.session;
      setSession(initialSession);
      setLastKnownAccount(cachedAccount);

      if (initialSession) {
        await persistSessionUser(initialSession.user);
        await setDeviceContinueActive(false);
        setIsDeviceContinue(false);
      } else if (
        AUTH_POLICY === 'device_continue' &&
        deviceContinueFlag &&
        cachedAccount
      ) {
        setIsDeviceContinue(true);
      }

      setLoading(false);
      if (initialSession) {
        tryRefreshSession();
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const account = userToLastKnownAccount(newSession.user);
        setLastKnownAccount(account);
        await saveLastKnownAccount(account);
        await setDeviceContinueActive(false);
        setIsDeviceContinue(false);
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url && isAuthRedirectUrl(url)) handleAuthRedirect(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isAuthRedirectUrl(url)) handleAuthRedirect(url);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tryRefreshSession();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      sub.remove();
      appStateSub.remove();
    };
  }, [tryRefreshSession]);

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
  };

  const enterDeviceContinue = async () => {
    if (AUTH_POLICY !== 'device_continue') return;
    const account = lastKnownAccount ?? (await loadLastKnownAccount());
    if (!account) {
      throw new Error('No account on this device. Sign in with Google first.');
    }
    setLastKnownAccount(account);
    setIsDeviceContinue(true);
    await setDeviceContinueActive(true);
  };

  const leaveDeviceContinue = async () => {
    await setDeviceContinueActive(false);
    setIsDeviceContinue(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await clearLastKnownAccount();
    await setDeviceContinueActive(false);
    setLastKnownAccount(null);
    setIsDeviceContinue(false);
  };

  const user = session?.user ?? null;
  const effectiveUser: EffectiveUser | null = user
    ? {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      }
    : isDeviceContinue && lastKnownAccount
      ? lastKnownToEffectiveUser(lastKnownAccount)
      : null;

  const authMode: AuthMode = session
    ? 'full'
    : isDeviceContinue && lastKnownAccount
      ? 'device_continue'
      : 'signed_out';

  const canUseApp =
    !!session ||
    (AUTH_POLICY === 'device_continue' && isDeviceContinue && !!lastKnownAccount);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        effectiveUser,
        lastKnownAccount,
        authMode,
        isDeviceContinue,
        canUseApp,
        isAdmin,
        loading,
        signInWithGoogle,
        enterDeviceContinue,
        leaveDeviceContinue,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
