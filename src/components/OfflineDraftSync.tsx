import { useAuth } from '../contexts/AuthContext';
import { useOfflineDraftSync } from '../hooks/useOfflineDraftSync';

/** Background worker: publishes locally saved posts when connectivity returns. */
export function OfflineDraftSync() {
  const { session } = useAuth();
  useOfflineDraftSync(session?.access_token);
  return null;
}
