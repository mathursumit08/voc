import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentFile = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(currentFile), "../../../..");

// Backend configuration is intentionally isolated from frontend Vite variables.
// Resolve from the file location so startup works from both repo root and
// npm workspace commands executed inside src/backend.
dotenv.config({ path: path.join(workspaceRoot, ".env.backend") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("VoC Prototype"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_VERSION: z.literal("v1").default("v1"),
  DATABASE_URL: z.string().url(),
  POSTGRES_DB: z.string().default("voc"),
  POSTGRES_USER: z.string().default("voc_user"),
  POSTGRES_PASSWORD: z.string().default("voc_password"),
  SWAGGER_TITLE: z.string().default("VoC Prototype API"),
  SWAGGER_VERSION: z.string().default("1.0.0"),
  RUN_MIGRATIONS_ON_START: z.coerce.boolean().default(true),
  MIGRATIONS_DIR: z.string().default("src/backend/data/migrations")
});

export const env = envSchema.parse(process.env);

export const apiBasePath = `/api/${env.API_VERSION}` as const;
