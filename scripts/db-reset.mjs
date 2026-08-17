// db-reset.mjs — Recreate the SQLite database from scratch (schema + demo seed).
// Usage: npm run db:reset
// Note: assumes default DATABASE_URL (file:overhaul.db). Stop the dev server first,
// otherwise the DB file is locked on Windows.
import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = ['overhaul.db', 'overhaul.db-wal', 'overhaul.db-shm'];

for (const f of files) {
	try {
		rmSync(f);
		console.log(`  🗑️  deleted ${f}`);
	} catch {
		// file already gone — fine
	}
}

console.log('🗄️  pushing schema...');
spawnSync('npx drizzle-kit push --force', { stdio: 'inherit', shell: true });

console.log('🌱 seeding...');
spawnSync('npx tsx src/lib/server/db/seed.ts', { stdio: 'inherit', shell: true });

console.log('✅ Database reset complete');
