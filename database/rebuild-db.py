#!/usr/bin/env python3
"""
Direct SQL execution via psycopg2 for Supabase
"""
import psycopg2

# Connection string
conn_string = "postgresql://postgres.fsohtauqtcftdjcjfdpq:TommyHyde101!@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

print("🔌 Connecting to Supabase...")
conn = psycopg2.connect(conn_string)
conn.autocommit = True
cursor = conn.cursor()

print("🧹 Executing cleanup...")
with open("01-cleanup.sql", "r") as f:
    cleanup_sql = f.read()
    
try:
    cursor.execute(cleanup_sql)
    print("✅ Cleanup complete")
except Exception as e:
    print(f"⚠️  Cleanup warnings: {e}")

print("\n🏗️  Creating schema...")
with open("02-schema.sql", "r") as f:
    schema_sql = f.read()

try:
    cursor.execute(schema_sql)
    print("✅ Schema created")
except Exception as e:
    print(f"❌ Schema error: {e}")
    conn.close()
    exit(1)

# Verify
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = cursor.fetchall()

print("\n📊 Tables in database:")
for table in tables:
    print(f"   ✓ {table[0]}")

cursor.close()
conn.close()

print("\n🎉 Database rebuild complete!")
