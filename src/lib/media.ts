/**
 * Quest proof media utilities
 * Uploads photo / video proof to the `proofs` Supabase Storage bucket.
 * Falls back gracefully when Supabase is not configured (local / demo mode).
 */

import { supabase } from '@/lib/supabase';

/**
 * Upload a quest proof blob to Supabase Storage.
 * Returns the public URL on success, throws on failure.
 */
export async function uploadQuestProof(
  userId: string,
  questId: string,
  blob: Blob,
): Promise<string> {
  if (!supabase) throw new Error('Storage is not configured.');

  const isVideo = blob.type.startsWith('video/');
  const ext = isVideo
    ? blob.type.includes('mp4') ? 'mp4' : 'webm'
    : 'webp';

  const path = `${userId}/quests/${questId}/proof-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('proofs')
    .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: blob.type });

  if (error) throw error;

  const { data } = supabase.storage.from('proofs').getPublicUrl(path);
  return data.publicUrl;
}
