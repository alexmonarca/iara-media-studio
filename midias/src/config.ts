import { createClient } from '@supabase/supabase-js';

export const config = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
export const GEMINI_API_KEY = config.geminiApiKey;
