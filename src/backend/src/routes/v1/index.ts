import { Router } from "express";
import { healthRouter } from "./health.js";
import { uploadsRouter } from "./uploads.js";

export const v1Router = Router();

v1Router.use(healthRouter);
v1Router.use(uploadsRouter);

