import fs from 'fs';
import path from 'path';
import pool from './connection';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');

  // Get all migration files sorted
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running migration: ${file}`);

    try {
      await pool.query(sql);
      console.log(`✓ Completed: ${file}`);
    } catch (error) {
      console.error(`✗ Failed: ${file}`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
  await pool.end();
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
