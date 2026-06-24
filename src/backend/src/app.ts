import cors from "cors";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { apiBasePath } from "./config/env.js";
import { v1Router } from "./routes/v1/index.js";
import { openApiDocument } from "./swagger/openapi.js";

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";

  res.status(400).json({
    message
  });
};

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use(apiBasePath, v1Router);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get("/openapi.json", (_req, res) => res.json(openApiDocument));
  app.use(errorHandler);

  return app;
}

