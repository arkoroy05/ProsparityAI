import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export function createClient(cookieStore) {
  return createServerComponentClient({
    cookies: () => cookieStore,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
} 