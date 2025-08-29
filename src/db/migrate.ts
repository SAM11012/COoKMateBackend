import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const runMigrate = async () => {
    console.log("Running migrations...");

    const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(migrationClient);

    await migrate(db, { migrationsFolder: 'drizzle' });

    await migrationClient.end();
    console.log("Migrations applied successfully!");
    process.exit(0);
};

runMigrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
