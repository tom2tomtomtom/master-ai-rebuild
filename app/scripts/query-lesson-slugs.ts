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

async function queryLessonSlugs() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('id', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`\nSample lessons (first 5):\n`);
  console.log(JSON.stringify(data, null, 2));
}

queryLessonSlugs();
