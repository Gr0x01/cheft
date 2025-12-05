import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DIRECT_URL!;

async function applyMigration() {
  console.log('Applying migration 013_duplicate_groups...');
  
  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql`
      ALTER TABLE public.duplicate_candidates
      ADD COLUMN IF NOT EXISTS group_id uuid
    `;
    console.log('✅ Added group_id column');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_group_id 
      ON public.duplicate_candidates(group_id)
    `;
    console.log('✅ Created index');

    await sql`
      COMMENT ON COLUMN public.duplicate_candidates.group_id IS 'Groups related duplicate pairs together (e.g., if A=B and B=C, they share a group_id)'
    `;
    console.log('✅ Added column comment');

    console.log('\n✅ Migration applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
