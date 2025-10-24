import { createClient } from '@supabase/supabase-js';
// Use a permissive client typing to avoid strict PostgREST generic mismatches across the app.
// If you prefer full typing, we can iteratively fix `database.types.ts` and usages.
// Note: database types are kept in `database.types.ts` but the client uses a permissive `any` generic
// to avoid broad type mismatches. Remove this import if you re-enable strict typing later.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
