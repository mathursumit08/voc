import { Router } from "express";
import { requireRole } from "../../auth/middleware.js";
import { detectWarrantySignals, listActiveWarrantySignals } from "../../warranty/warrantySignalService.js";

export const warrantyRouter = Router();

warrantyRouter.post("/warranty-signals/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (_req, res, next) => {
  try {
    const result = await detectWarrantySignals();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

warrantyRouter.get("/warranty-signals", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const signals = await listActiveWarrantySignals(Number.isFinite(limit) ? limit : 10);
    res.json({ signals });
  } catch (error) {
    next(error);
  }
});
