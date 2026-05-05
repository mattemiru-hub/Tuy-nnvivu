
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.startsWith('http'));
}

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
    );
  }

  try {
    // Basic validation before passing to createClient
    const parsedUrl = new URL(supabaseUrl);
    if (window.location.protocol === 'https:' && parsedUrl.protocol === 'http:') {
      console.warn('Mixed Content Warning: You are using an insecure http Supabase URL on an https site. This will likely cause "Failed to fetch" errors.');
    }
  } catch (e) {
    throw new Error(`Invalid VITE_SUPABASE_URL: "${supabaseUrl}". It must be a valid URL starting with http:// or https://`);
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}
