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

async function checkSchema() {
  // Query a single stage to see all columns
  const { data, error } = await supabase
    .from('lesson_stages')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error querying stage:', error.message);
    return;
  }

  console.log('\nSample lesson_stage record:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n\nColumn names:');
  Object.keys(data).forEach(key => {
    console.log(`- ${key}: ${typeof data[key]}`);
  });
}

checkSchema();
