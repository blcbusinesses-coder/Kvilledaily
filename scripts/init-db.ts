/**
 * Database initialization script.
 * Reads the migration SQL and runs it against Supabase.
 * Usage: npm run init-db
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function main() {
  console.log('🗄  Kendallville Daily — Database Initialization');
  console.log('='.repeat(50));

  const client = createClient(supabaseUrl!, serviceKey!);

  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log(`Running migration: ${sqlPath}`);

  // Split on semicolons and run each statement
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  let succeeded = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      const { error } = await client.rpc('exec_sql', { sql: stmt + ';' });
      if (error) throw error;
      succeeded++;
    } catch (err) {
      // Supabase doesn't expose raw SQL exec via JS client directly.
      // You'll need to run the SQL in the Supabase SQL Editor manually.
      // This script prints the SQL for you to copy.
      failed++;
    }
  }

  console.log('\n📋 INSTRUCTIONS:');
  console.log('   The Supabase JS client does not support raw DDL execution.');
  console.log('   Please run the following SQL in your Supabase SQL Editor:\n');
  console.log('   Dashboard → SQL Editor → New query → Paste & Run:\n');
  console.log(`   File: ${sqlPath}`);
  console.log('\n' + '-'.repeat(50));
  console.log(sql);
  console.log('-'.repeat(50));

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
