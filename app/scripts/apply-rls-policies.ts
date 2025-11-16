import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSPolicies() {
  console.log('================================================================================');
  console.log('APPLYING RLS POLICIES TO lesson_stages');
  console.log('================================================================================\n');

  // Note: Supabase JS client doesn't support DDL operations directly
  // We need to use the SQL editor in Supabase dashboard or use the Management API

  console.log('⚠️  RLS policies must be applied through Supabase Dashboard:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to: SQL Editor');
  console.log('4. Run this SQL:');
  console.log('');
  console.log('```sql');
  console.log('-- Enable RLS on lesson_stages table');
  console.log('ALTER TABLE lesson_stages ENABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('-- Drop existing policies if any');
  console.log('DROP POLICY IF EXISTS "Users can view published lesson stages" ON lesson_stages;');
  console.log('DROP POLICY IF EXISTS "Service role has full access to lesson stages" ON lesson_stages;');
  console.log('');
  console.log('-- Policy: Allow authenticated users to read published stages');
  console.log('CREATE POLICY "Users can view published lesson stages"');
  console.log('ON lesson_stages');
  console.log('FOR SELECT');
  console.log('TO authenticated');
  console.log('USING (is_published = true);');
  console.log('');
  console.log('-- Policy: Allow service role to do everything');
  console.log('CREATE POLICY "Service role has full access to lesson stages"');
  console.log('ON lesson_stages');
  console.log('FOR ALL');
  console.log('TO service_role');
  console.log('USING (true)');
  console.log('WITH CHECK (true);');
  console.log('```');
  console.log('');
  console.log('After applying, refresh the lesson page to see stages!');
}

applyRLSPolicies();
