import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { authRouter } from "./auth.js";
import { crmRouter } from "./crm.js";
import { dashboardRouter } from "./dashboard.js";
import { feedbackRouter } from "./feedback.js";
import { healthRouter } from "./health.js";
import { responsesRouter } from "./responses.js";
import { uploadsRouter } from "./uploads.js";

export const v1Router = Router();

v1Router.use(authRouter);
v1Router.use(requireAuth);
v1Router.use(healthRouter);
v1Router.use(uploadsRouter);
v1Router.use(dashboardRouter);
v1Router.use(feedbackRouter);
v1Router.use(crmRouter);
v1Router.use(responsesRouter);

