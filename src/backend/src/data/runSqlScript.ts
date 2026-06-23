import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { env } from "../config/env.js";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../..");

function resolveScriptPath(scriptPath: string) {
  return path.isAbsolute(scriptPath) ? scriptPath : path.resolve(backendRoot, scriptPath);
}

async function runSqlScript() {
  const scriptPath = process.argv[2];

  if (!scriptPath) {
    throw new Error("Missing SQL script path. Example: npm run seed:prototype --workspace @voc/backend");
  }

  const resolvedScriptPath = resolveScriptPath(scriptPath);
  const sql = await fs.readFile(resolvedScriptPath, "utf8");
  const client = new Client({ connectionString: env.DATABASE_URL });

  await client.connect();
  try {
    // Seed scripts are intentionally explicit commands; they are not part of
    // backend startup and should only be run when prototype data needs a reset.
    await client.query(sql);
    console.log(`SQL script completed: ${resolvedScriptPath}`);
  } finally {
    await client.end();
  }
}

runSqlScript().catch((error: unknown) => {
  console.error("SQL script failed.", error);
  process.exit(1);
});

