import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, AppState } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const CHECK_URL = 'https://clients3.google.com/generate_204';
const CHECK_INTERVAL_MS = 5000;

async function checkOnline(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(CHECK_URL, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-48)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCheck = async () => {
    const online = await checkOnline();
    setIsOffline((prev) => {
      if (!online && !prev) setWasOffline(true);
      return !online;
    });
  };

  useEffect(() => {
    runCheck();
    intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (isOffline || wasOffline) {
      Animated.spring(translateY, {
        toValue: isOffline ? 0 : -48,
        useNativeDriver: true,
        bounciness: 0,
      }).start(() => {
        if (!isOffline) setWasOffline(false);
      });
    }
  }, [isOffline, wasOffline]);

  if (!isOffline && !wasOffline) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <MaterialIcons name="wifi-off" size={14} color="#fff" />
      <Text style={styles.text}>
        {isOffline ? 'You are offline' : 'Back online'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
