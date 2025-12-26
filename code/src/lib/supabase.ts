import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://usfajwsbstywkmgzfnwk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZmFqd3Nic3R5d2ttZ3pmbndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTY1NzYsImV4cCI6MjA4MjIzMjU3Nn0.D96iuTQhuPDhzokJpkl5BQ8la3koFGxMcOBqwre6DPw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
