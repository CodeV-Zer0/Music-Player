import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Uses the service role key (server-side only — never expose this to the mobile app)
// so the backend has full read/write access to the storage bucket regardless of RLS policies.
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "mymusic";

export async function uploadFile(key, body, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return key;
}

// Signed URL expires in 1 hour — mobile app fetches a fresh one each time it plays a track
export async function getSignedStreamUrl(key, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, expiresInSeconds);
  if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
  return data.signedUrl;
}
