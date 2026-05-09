import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const PROJECT_ID: string =
  Constants.expoConfig?.extra?.eas?.projectId ?? '';

// Configure how notifications are presented while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, obtains the Expo push token, and upserts it into
 * the `mobile_push_tokens` table for the signed-in user.
 * Safe to call multiple times (idempotent via upsert).
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('[Push] Skipping token registration — not a physical device (simulator)');
    return;
  }

  if (!PROJECT_ID) {
    console.error('[Push] Missing EAS projectId in app.json extra.eas.projectId');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[Push] Existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[Push] Permission after request:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Push notification permission not granted — token not registered');
    return;
  }

  // Android requires an explicit notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6EE7B7',
    });
  }

  const { data: token, error: tokenError } = await Notifications.getExpoPushTokenAsync({
    projectId: PROJECT_ID,
  });

  if (tokenError || !token) {
    console.error('[Push] Failed to get Expo push token:', tokenError);
    return;
  }

  console.log('[Push] Got Expo push token:', token);

  const { error: dbError } = await supabase
    .from('mobile_push_tokens')
    .upsert(
      { user_id: userId, token, platform: Platform.OS },
      { onConflict: 'user_id,token' }
    );

  if (dbError) {
    console.error('[Push] Failed to save push token to DB:', dbError.message, dbError.code);
  } else {
    console.log('[Push] Push token saved for user', userId);
  }
}

/**
 * Removes the current device's push token from Supabase when the user signs out.
 * Must be called before `supabase.auth.signOut()` so RLS still allows the delete.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  try {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    await supabase
      .from('mobile_push_tokens')
      .delete()
      .match({ user_id: userId, token: tokenData });
  } catch {
    // Permission revoked or token unavailable — nothing to remove
  }
}

/**
 * Calls the Supabase Edge Function that fans out Expo push notifications
 * to all other logged-in users when a new post is published.
 */
export async function sendNewPostNotification(
  blog: { id: string; title: string; authorName?: string | null; authorId?: string | null },
  accessToken?: string | null
): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  await fetch(`${supabaseUrl}/functions/v1/send-post-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      postId: blog.id,
      postTitle: blog.title,
      authorName: blog.authorName,
      authorId: blog.authorId,
    }),
  });
}
