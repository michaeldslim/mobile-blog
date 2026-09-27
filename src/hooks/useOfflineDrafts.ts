import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listOfflineDrafts } from '../lib/offlineDrafts';

export const OFFLINE_DRAFTS_QUERY_KEY = ['offline-drafts'] as const;

export function useOfflineDrafts() {
  return useQuery({
    queryKey: OFFLINE_DRAFTS_QUERY_KEY,
    queryFn: listOfflineDrafts,
    staleTime: 0,
  });
}

export function useInvalidateOfflineDrafts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: OFFLINE_DRAFTS_QUERY_KEY });
}
