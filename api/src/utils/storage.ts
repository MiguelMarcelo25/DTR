import { env } from '../config/env';
import { getSupabase, supabaseStorageEnabled } from '../config/supabase';
import { AppError } from './errors';

const BUCKET = env.SUPABASE_STORAGE_BUCKET;

export interface StoredFile {
  path: string;
  url: string;
}

/** Build a namespaced object path, e.g. `documents/<employeeId>/<ts>-<name>`. */
export function buildObjectPath(folder: string, employeeId: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Date.now is fine here (runtime side-effect, not a workflow journal)
  const stamp = Date.now();
  return `${folder}/${employeeId}/${stamp}-${safe}`;
}

/**
 * Upload a buffer to Supabase Storage and return its path + a signed URL.
 * Buckets are private; we hand out time-boxed signed URLs so files are never
 * publicly enumerable.
 */
export async function uploadBuffer(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<StoredFile> {
  if (!supabaseStorageEnabled) {
    throw new AppError('File storage is not configured', 503, 'STORAGE_UNAVAILABLE');
  }
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) throw new AppError(`Upload failed: ${error.message}`, 502, 'STORAGE_ERROR');

  const url = await createSignedUrl(path);
  return { path, url };
}

/** Create a signed URL (default 1 hour) for a stored object. */
export async function createSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new AppError(`Signed URL failed: ${error?.message}`, 502, 'STORAGE_ERROR');
  return data.signedUrl;
}

export async function removeObject(path: string): Promise<void> {
  if (!supabaseStorageEnabled) return;
  const supabase = getSupabase();
  await supabase.storage.from(BUCKET).remove([path]);
}
