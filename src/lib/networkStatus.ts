const CHECK_URL = 'https://clients3.google.com/generate_204';
const CHECK_TIMEOUT_MS = 3000;

/** True when the device can reach the internet (not just Wi‑Fi associated). */
export async function checkOnline(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
    const res = await fetch(CHECK_URL, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}
