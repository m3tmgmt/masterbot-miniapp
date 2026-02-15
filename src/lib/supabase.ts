// Supabase клиент для MasterBot Mini App
// Проверка env vars + типизированный клиент
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Отсутствуют переменные окружения VITE_SUPABASE_URL и/или VITE_SUPABASE_ANON_KEY. ' +
    'Проверь .env файл (см. .env.example)'
  );
}

// TODO: После supabase gen types заменить на типизированный клиент:
// import type { Database } from '../types/database.ts';
// export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
