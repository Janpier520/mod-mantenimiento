// Vitest setupFiles entry: runs in the worker before any test-file module import.
// db/index.ts reads DATABASE_URL at module load and creates the libSQL client
// eagerly, so this MUST be set before the first import of anything pulling $lib/server/db.
process.env.DATABASE_URL = 'file::memory:';
process.env.NODE_ENV = 'test';
