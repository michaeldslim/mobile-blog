import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';

const ACCOUNT_KEY = 'mobile-blog:last-known-account';
const DEVICE_CONTINUE_KEY = 'mobile-blog:device-continue-active';

export interface LastKnownAccount {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  savedAt: string;
}

/** Minimal user shape for offline compose / profile display. */
export interface EffectiveUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export function userToLastKnownAccount(user: User): LastKnownAccount {
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name,
    avatarUrl: user.user_metadata?.avatar_url,
    savedAt: new Date().toISOString(),
  };
}

export function lastKnownToEffectiveUser(account: LastKnownAccount): EffectiveUser {
  return {
    id: account.id,
    email: account.email,
    user_metadata: {
      full_name: account.fullName,
      avatar_url: account.avatarUrl,
    },
  };
}

export async function loadLastKnownAccount(): Promise<LastKnownAccount | null> {
  const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastKnownAccount;
  } catch {
    return null;
  }
}

export async function saveLastKnownAccount(account: LastKnownAccount): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export async function clearLastKnownAccount(): Promise<void> {
  await AsyncStorage.removeItem(ACCOUNT_KEY);
}

export async function loadDeviceContinueActive(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEVICE_CONTINUE_KEY)) === '1';
}

export async function setDeviceContinueActive(active: boolean): Promise<void> {
  if (active) {
    await AsyncStorage.setItem(DEVICE_CONTINUE_KEY, '1');
  } else {
    await AsyncStorage.removeItem(DEVICE_CONTINUE_KEY);
  }
}
