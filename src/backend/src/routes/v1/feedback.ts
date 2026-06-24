import { Router } from "express";
import { getFeedbackRecordById, listFeedbackRecords } from "../../feedback/feedbackRepository.js";

export const feedbackRouter = Router();

feedbackRouter.get("/feedback", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const result = await listFeedbackRecords({
      sourceType: req.query.sourceType?.toString(),
      processingStatus: req.query.processingStatus?.toString(),
      dealerId: req.query.dealerId?.toString(),
      customerId: req.query.customerId?.toString(),
      vehicleId: req.query.vehicleId?.toString(),
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.get("/feedback/:id", async (req, res, next) => {
  try {
    const feedbackRecord = await getFeedbackRecordById(req.params.id);

    if (!feedbackRecord) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(feedbackRecord);
  } catch (error) {
    next(error);
  }
});

