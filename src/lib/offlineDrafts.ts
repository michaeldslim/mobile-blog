import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlogStatus } from '../types';

const STORAGE_KEY = 'mobile-blog:offline-drafts';

export interface OfflineDraft {
  localId: string;
  title: string;
  content: string;
  tags: string[];
  status: BlogStatus;
  /** Local file URI — uploaded when syncing. */
  localImageUri: string | null;
  authorId: string;
  authorName?: string;
  savedAt: string;
  updatedAt: string;
}

export function createOfflineDraftId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<OfflineDraft[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(drafts: OfflineDraft[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export async function listOfflineDrafts(): Promise<OfflineDraft[]> {
  const drafts = await readAll();
  return drafts.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getOfflineDraft(localId: string): Promise<OfflineDraft | null> {
  const drafts = await readAll();
  return drafts.find((d) => d.localId === localId) ?? null;
}

export async function upsertOfflineDraft(
  draft: Omit<OfflineDraft, 'savedAt' | 'updatedAt'> & { savedAt?: string; updatedAt?: string }
): Promise<OfflineDraft> {
  const now = new Date().toISOString();
  const drafts = await readAll();
  const idx = drafts.findIndex((d) => d.localId === draft.localId);
  const record: OfflineDraft = {
    ...draft,
    savedAt: draft.savedAt ?? (idx >= 0 ? drafts[idx].savedAt : now),
    updatedAt: now,
  };
  if (idx >= 0) {
    drafts[idx] = record;
  } else {
    drafts.push(record);
  }
  await writeAll(drafts);
  return record;
}

export async function removeOfflineDraft(localId: string): Promise<void> {
  const drafts = await readAll();
  await writeAll(drafts.filter((d) => d.localId !== localId));
}
