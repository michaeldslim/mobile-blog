import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { checkOnline } from '../lib/networkStatus';
import { listOfflineDrafts } from '../lib/offlineDrafts';
import { publishOfflineDraft } from '../lib/syncOfflineDrafts';
import { OFFLINE_DRAFTS_QUERY_KEY } from './useOfflineDrafts';

const SYNC_INTERVAL_MS = 8000;

export function useOfflineDraftSync(accessToken?: string | null) {
  const qc = useQueryClient();
  const syncingRef = useRef(false);

  const syncPendingDrafts = useCallback(async () => {
    if (!accessToken || syncingRef.current) return;

    const online = await checkOnline();
    if (!online) return;

    const drafts = await listOfflineDrafts();
    if (drafts.length === 0) return;

    syncingRef.current = true;
    try {
      let published = 0;
      for (const draft of drafts) {
        try {
          await publishOfflineDraft(draft, accessToken);
          published += 1;
        } catch (err) {
          if (__DEV__) console.warn('[OfflineSync] failed for draft', draft.localId, err);
          break;
        }
      }
      if (published > 0) {
        await qc.invalidateQueries({ queryKey: OFFLINE_DRAFTS_QUERY_KEY });
        qc.invalidateQueries({ queryKey: ['blogs'] });
        qc.invalidateQueries({ queryKey: ['blogs-calendar'] });
      }
    } finally {
      syncingRef.current = false;
    }
  }, [accessToken, qc]);

  useEffect(() => {
    syncPendingDrafts();
    const interval = setInterval(syncPendingDrafts, SYNC_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncPendingDrafts();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [syncPendingDrafts]);

  return { syncPendingDrafts };
}
