import { Router } from "express";
import { healthRouter } from "./health.js";

export const v1Router = Router();

v1Router.use(healthRouter);

