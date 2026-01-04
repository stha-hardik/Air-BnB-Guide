
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gveqwctpkqcivwbnzydx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZXF3Y3Rwa3FjaXZ3Ym56eWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNDU3OTMsImV4cCI6MjA4MjgyMTc5M30.5-4V2Wt3EQ5RdrCYuR5xR6tjq4QJ-IvHDUVWcSSzfmg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
