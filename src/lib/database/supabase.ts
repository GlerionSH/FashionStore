// Configuración de Supabase
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY');
}

declare global {
	// eslint-disable-next-line no-var
	var __supabaseClient: ReturnType<typeof createClient<Database>> | undefined;
}

export const supabase = globalThis.__supabaseClient
	? globalThis.__supabaseClient
	: (globalThis.__supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey));
