import { Router } from "express";
import { getExecutiveDashboardSummary } from "../../dashboard/executiveDashboardService.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/executive", async (_req, res, next) => {
  try {
    const summary = await getExecutiveDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});
