const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applySchema() {
  console.log('📊 Applying database schema...\n');
  
  const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split SQL by statements (simple split on semicolons)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;
    
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
      } else {
        console.log(`✅ Statement ${i + 1} completed`);
      }
    } catch (err) {
      console.log(`⚠️  Statement ${i + 1}: ${err.message}`);
    }
  }
  
  console.log('\n✅ Schema application complete!');
}

applySchema().catch(console.error);
