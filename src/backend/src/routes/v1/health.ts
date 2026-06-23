import { Router } from "express";
import { env } from "../../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  // Keep this endpoint dependency-light so it can confirm the API process is alive
  // even when downstream services are not wired into the prototype yet.
  res.status(200).json({
    status: "Ok",
    service: env.APP_NAME,
    version: env.API_VERSION,
    timestamp: new Date().toISOString()
  });
});

