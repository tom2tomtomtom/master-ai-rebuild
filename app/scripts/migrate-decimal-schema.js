const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract database connection details from Supabase URL and key
// Supabase URL format: https://[PROJECT_ID].supabase.co
const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

async function migrateToPgSQL() {
  console.log('🔄 Migrating schema to support decimal lesson numbers...\n');

  // Create a direct PostgreSQL connection using Supabase's postgres_url
  const pool = new Pool({
    host: `${projectId}.db.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();

    console.log('✅ Connected to Supabase PostgreSQL database\n');

    // First, let's check the current schema
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name='lessons' AND column_name='lesson_number'
    `);

    if (checkResult.rows.length === 0) {
      console.log('⚠️  lesson_number column not found');
      client.release();
      await pool.end();
      return;
    }

    const currentType = checkResult.rows[0].data_type;
    console.log(`📊 Current lesson_number type: ${currentType}`);

    if (currentType === 'integer') {
      console.log('\n🔄 Converting INTEGER to NUMERIC(4,1)...\n');

      // Start transaction
      await client.query('BEGIN');

      try {
        // Drop the unique constraint
        await client.query(`
          ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_lesson_number_key
        `);
        console.log('✅ Dropped existing constraint');

        // Alter the column type
        await client.query(`
          ALTER TABLE lessons ALTER COLUMN lesson_number TYPE NUMERIC(4,1)
        `);
        console.log('✅ Converted column to NUMERIC(4,1)');

        // Re-add the unique constraint
        await client.query(`
          ALTER TABLE lessons ADD CONSTRAINT lessons_lesson_number_key UNIQUE (lesson_number)
        `);
        console.log('✅ Re-added unique constraint');

        // Commit transaction
        await client.query('COMMIT');
        console.log('\n✅ Migration completed successfully!');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } else {
      console.log(`✅ lesson_number is already ${currentType} type - no migration needed`);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

migrateToPgSQL().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
