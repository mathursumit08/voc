import { Router } from "express";
import { getFeedbackRecordById, listFeedbackRecords } from "../../feedback/feedbackRepository.js";
import { processFeedbackLanguage, processPendingFeedbackLanguages } from "../../nlp/languageService.js";
import { processFeedbackSentimentTopics, processPendingFeedbackSentimentTopics } from "../../nlp/sentimentTopicService.js";

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

feedbackRouter.post("/feedback/language-detection/run", async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await processPendingFeedbackLanguages(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/language-detection", async (req, res, next) => {
  try {
    const result = await processFeedbackLanguage(req.params.id);

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/sentiment-topics/run", async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await processPendingFeedbackSentimentTopics(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/sentiment-topics", async (req, res, next) => {
  try {
    const result = await processFeedbackSentimentTopics(req.params.id);

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

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

