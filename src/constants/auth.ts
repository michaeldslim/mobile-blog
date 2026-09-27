/**
 * `device_continue` — first sign-in required; later can use the app on-device without
 * a live session (local drafts only) until Google sign-in restores sync.
 */
export type AuthPolicy = 'strict' | 'device_continue';

export const AUTH_POLICY: AuthPolicy = 'device_continue';

/** Deep-link scheme — must match app.json `expo.scheme` and native intent filters. */
export const AUTH_SCHEME = 'mobile-blog';

export const AUTH_REDIRECT_PATH = 'auth/callback';

export const AUTH_REDIRECT_URI = `${AUTH_SCHEME}://${AUTH_REDIRECT_PATH}`;

export function isAuthRedirectUrl(url: string): boolean {
  return url.startsWith(`${AUTH_SCHEME}://`);
}
