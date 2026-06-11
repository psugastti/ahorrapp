import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://itbwqrclualkitsjkyta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0YndxcmNsdWFsa2l0c2preXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTkzNzAsImV4cCI6MjA5NDczNTM3MH0.Mb_rn8n96Rv53eam-1bmybEtpM8oA6fIZkC6uzIPfKc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
