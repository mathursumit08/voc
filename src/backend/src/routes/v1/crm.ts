import { Router } from "express";
import { requireRole } from "../../auth/middleware.js";
import { closeCrmTask, createCrmTaskForFeedback } from "../../crm/crmTaskService.js";

export const crmRouter = Router();

crmRouter.post("/feedback/:id/crm-tasks", requireRole(["Admin", "OemUser", "DealerUser"]), async (req, res, next) => {
  try {
    const task = await createCrmTaskForFeedback({
      feedbackRecordId: req.params.id.toString(),
      dealerCode: req.user?.role === "DealerUser" ? req.user.dealerCode : undefined,
      dueAt: req.body?.dueAt?.toString()
    });

    if (!task) {
      res.status(404).json({ message: "Feedback record not found for CRM task creation." });
      return;
    }

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

crmRouter.patch("/crm-tasks/:id/close", requireRole(["Admin", "OemUser", "DealerUser"]), async (req, res, next) => {
  try {
    const resolutionNotes = req.body?.resolutionNotes?.toString().trim();

    if (!resolutionNotes) {
      res.status(400).json({ message: "resolutionNotes is required to close a CRM task." });
      return;
    }

    const task = await closeCrmTask({
      taskId: req.params.id.toString(),
      resolutionNotes,
      dealerCode: req.user?.role === "DealerUser" ? req.user.dealerCode : undefined
    });

    if (!task) {
      res.status(404).json({ message: "CRM task not found or not accessible." });
      return;
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});
