import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '@env';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase URL or key is missing');
}

// Create and export the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;
