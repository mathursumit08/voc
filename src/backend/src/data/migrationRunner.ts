import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { env } from "../config/env.js";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../..");
const workspaceRoot = path.resolve(backendRoot, "../..");

interface MigrationFile {
  name: string;
  fullPath: string;
}

function resolveMigrationsDir() {
  return path.isAbsolute(env.MIGRATIONS_DIR)
    ? env.MIGRATIONS_DIR
    : path.resolve(workspaceRoot, env.MIGRATIONS_DIR);
}

async function getMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDir = resolveMigrationsDir();
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(migrationsDir, entry.name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function ensureMigrationTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(client: Client) {
  const result = await client.query<{ migration_name: string }>(
    "SELECT migration_name FROM schema_migrations ORDER BY migration_name ASC;"
  );

  return new Set(result.rows.map((row) => row.migration_name));
}

async function applyMigration(client: Client, migration: MigrationFile) {
  const sql = await fs.readFile(migration.fullPath, "utf8");

  // Each migration file is applied atomically and then recorded, so a failed
  // migration can be fixed and retried without leaving a partial history row.
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (migration_name) VALUES ($1);", [migration.name]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runPendingMigrations() {
  if (!env.RUN_MIGRATIONS_ON_START) {
    console.log("Database startup migrations are disabled.");
    return;
  }

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    await ensureMigrationTable(client);
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationFiles = await getMigrationFiles();
    const pendingMigrations = migrationFiles.filter((migration) => !appliedMigrations.has(migration.name));

    for (const migration of pendingMigrations) {
      console.log(`Applying database migration ${migration.name}`);
      await applyMigration(client, migration);
    }

    console.log(`Database migrations complete. Applied ${pendingMigrations.length} pending migration(s).`);
  } finally {
    await client.end();
  }
}
