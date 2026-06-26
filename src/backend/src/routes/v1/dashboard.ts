import { Router } from "express";
import { requireRole } from "../../auth/middleware.js";
import { getDealerDashboardSummary, searchDealerLookupOptions } from "../../dashboard/dealerDashboardService.js";
import { getExecutiveDashboardSummary } from "../../dashboard/executiveDashboardService.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/executive", requireRole(["Admin", "OemUser"]), async (_req, res, next) => {
  try {
    const summary = await getExecutiveDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/dashboard/dealers", requireRole(["Admin", "OemUser"]), async (req, res, next) => {
  try {
    const dealers = await searchDealerLookupOptions(req.query.search?.toString());
    res.json({ dealers });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/dashboard/dealer", requireRole(["Admin", "OemUser", "DealerUser"]), async (req, res, next) => {
  try {
    const isDealerUser = req.user?.role === "DealerUser";
    const summary = await getDealerDashboardSummary({
      dealerCode: isDealerUser ? req.user?.dealerCode : req.query.dealerCode?.toString(),
      dealerId: isDealerUser ? undefined : req.query.dealerId?.toString()
    });

    if (!summary) {
      res.status(404).json({ message: "Dealer not found." });
      return;
    }

    res.json(summary);
  } catch (error) {
    next(error);
  }
});
