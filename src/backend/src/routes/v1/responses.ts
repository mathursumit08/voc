import { Router } from "express";
import { requireRole } from "../../auth/middleware.js";
import { generateResponseDraft } from "../../responses/responseDraftService.js";

export const responsesRouter = Router();

responsesRouter.post("/feedback/:id/response-draft", requireRole(["Admin", "OemUser", "DealerUser"]), async (req, res, next) => {
  try {
    const draft = await generateResponseDraft(
      req.params.id.toString(),
      req.user?.role === "DealerUser" ? req.user.dealerCode : undefined
    );

    if (!draft) {
      res.status(404).json({ message: "Feedback record not found for response draft generation." });
      return;
    }

    res.json(draft);
  } catch (error) {
    next(error);
  }
});
