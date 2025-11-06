// Configuración de Supabase
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
