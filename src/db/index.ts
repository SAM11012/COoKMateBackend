import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import * as schema from './schema';

if (!process.env.NEON_DB_DATABASE) {
  throw new Error('NEON_DB_DATABASE environment variable is not set');
}

const client = postgres(process.env.NEON_DB_DATABASE);
export const db = drizzle(client, { schema });
