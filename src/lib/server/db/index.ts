import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'file:overhaul.db';
const client = createClient({ url });

// ponytail: WAL mode prevents DB corruption on crash, improves concurrent reads
client.execute('PRAGMA journal_mode=WAL');
client.execute('PRAGMA busy_timeout=5000');
// Foreign keys are OFF by default in SQLite per connection — enable so declared
// constraints and onDelete cascades actually apply in runtime.
client.execute('PRAGMA foreign_keys=ON');

export const db = drizzle(client, { schema });
