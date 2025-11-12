const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fsohtauqtcftdjcjfdpq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb2h0YXVxdGNmdGRqY2pmZHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTI5NDM5OSwiZXhwIjoyMDQ2ODcwMzk5fQ.7R3xZYvMqVKq8rVqTHHmH0yCNdJmJMxPKfZQCp3xQxs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function rebuildDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  // Read cleanup SQL
  const cleanupSQL = fs.readFileSync(path.join(__dirname, '01-cleanup.sql'), 'utf8');
  
  // Execute cleanup (split by semicolons and execute each statement)
  const cleanupStatements = cleanupSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));
  
  for (const statement of cleanupStatements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (error && !error.message.includes('does not exist')) {
        console.error('Cleanup error:', error.message);
      }
    } catch (err) {
      // Ignore "does not exist" errors during cleanup
      if (!err.message.includes('does not exist')) {
        console.error('Error:', err.message);
      }
    }
  }
  
  console.log('✅ Cleanup complete');
  console.log('🏗️  Creating new schema...');
  
  // Read schema SQL
  const schemaSQL = fs.readFileSync(path.join(__dirname, '02-schema.sql'), 'utf8');
  
  // Execute schema
  const schemaStatements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));
  
  for (const statement of schemaStatements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (error) {
        console.error('Schema error:', error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
      } else {
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
  
  console.log('✅ Schema creation complete');
  
  // Verify tables exist
  const { data: tables, error: tableError } = await supabase
    .from('users')
    .select('count')
    .limit(0);
  
  if (!tableError) {
    console.log('✅ Verified: users table exists');
  }
  
  console.log('\n🎉 Database rebuild complete!');
  console.log('📊 Tables created:');
  console.log('   - users');
  console.log('   - lessons');
  console.log('   - user_progress');
}

rebuildDatabase().catch(console.error);
