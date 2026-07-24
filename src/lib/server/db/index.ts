import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'file:equip-lab.db';
const client = createClient({ url });

// ponytail: WAL mode prevents DB corruption on crash, improves concurrent reads
client.execute('PRAGMA journal_mode=WAL');
client.execute('PRAGMA busy_timeout=5000');

export const db = drizzle(client, { schema });
