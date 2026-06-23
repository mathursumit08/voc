import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runPendingMigrations } from "./data/migrationRunner.js";

async function startServer() {
  await runPendingMigrations();

  const app = createApp();

  app.listen(env.API_PORT, env.API_HOST, () => {
    // Startup logs intentionally avoid secrets while giving enough context for demos.
    console.log(`${env.APP_NAME} API listening on http://${env.API_HOST}:${env.API_PORT}/api/${env.API_VERSION}`);
    console.log(`Swagger docs available at http://${env.API_HOST}:${env.API_PORT}/api-docs`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Backend startup failed.", error);
  process.exit(1);
});
