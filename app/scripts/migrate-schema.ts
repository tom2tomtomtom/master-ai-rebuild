import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function migrateSchema() {
  console.log('🔄 Applying schema migration...\n')

  try {
    // Execute the migration SQL directly
    const { error } = await supabase.rpc('exec', {
      sql: `
        -- MIGRATION: Update lesson_number to support decimals (0.5, 9.5)
        DO $$
        BEGIN
          -- Check if column exists and is INTEGER type
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='lessons' AND column_name='lesson_number' AND data_type='integer'
          ) THEN
            -- Drop the unique constraint if it exists
            ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_lesson_number_key;
            -- Alter column type to support decimals
            ALTER TABLE lessons ALTER COLUMN lesson_number TYPE NUMERIC(4,1);
            -- Re-add unique constraint
            ALTER TABLE lessons ADD CONSTRAINT lessons_lesson_number_key UNIQUE (lesson_number);
            RAISE NOTICE 'Successfully migrated lesson_number column to NUMERIC(4,1)';
          ELSE
            RAISE NOTICE 'lesson_number column is already NUMERIC type or table does not exist';
          END IF;
        END $$;
      `
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Schema migration completed successfully!')
    console.log('ℹ️  lesson_number column now supports decimal values (0.5, 9.5, etc.)')
  } catch (err) {
    console.error('❌ Error executing migration:', err)
    process.exit(1)
  }
}

// Run the migration
migrateSchema().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
