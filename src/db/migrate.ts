import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, libsql } from './client.ts';

/**
 * Apply all generated migrations in ./drizzle to the configured database.
 * Run with `npm run db:migrate`. Generate migrations first with `npm run db:generate`.
 */
async function main() {
  console.log('Running migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ Migrations applied.');
  libsql.close();
}

main().catch((err) => {
  console.error('✖ Migration failed:', err);
  process.exit(1);
});
