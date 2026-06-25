import { Router } from "express";
import { dashboardRouter } from "./dashboard.js";
import { feedbackRouter } from "./feedback.js";
import { healthRouter } from "./health.js";
import { uploadsRouter } from "./uploads.js";

export const v1Router = Router();

v1Router.use(healthRouter);
v1Router.use(uploadsRouter);
v1Router.use(dashboardRouter);
v1Router.use(feedbackRouter);

