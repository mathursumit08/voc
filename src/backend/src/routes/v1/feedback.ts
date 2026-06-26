import { Router } from "express";
import { requireRole } from "../../auth/middleware.js";
import { getFeedbackRecordById, listFeedbackRecords } from "../../feedback/feedbackRepository.js";
import { generateChurnRiskScore, generatePendingChurnRiskScores } from "../../nlp/churnRiskService.js";
import { processFeedbackIssueClassification, processPendingFeedbackIssueClassifications } from "../../nlp/issueClassificationService.js";
import { processFeedbackLanguage, processPendingFeedbackLanguages } from "../../nlp/languageService.js";
import { detectPendingRepeatComplaints, detectRepeatComplaint } from "../../nlp/repeatComplaintService.js";
import { processFeedbackSentimentTopics, processPendingFeedbackSentimentTopics } from "../../nlp/sentimentTopicService.js";
import { processFeedbackUrgency, processPendingFeedbackUrgency } from "../../nlp/urgencyService.js";

export const feedbackRouter = Router();

feedbackRouter.get("/feedback", requireRole(["Admin", "OemUser", "DealerUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);
    const assignedDealerCode = req.user?.role === "DealerUser" ? req.user.dealerCode : undefined;

    const result = await listFeedbackRecords({
      sourceType: req.query.sourceType?.toString(),
      processingStatus: req.query.processingStatus?.toString(),
      dealerId: req.query.dealerId?.toString(),
      dealerCode: assignedDealerCode,
      dealerName: req.query.dealerName?.toString(),
      customerId: req.query.customerId?.toString(),
      vehicleId: req.query.vehicleId?.toString(),
      urgencyLevel: req.query.urgencyLevel?.toString(),
      churnRiskLevel: req.query.churnRiskLevel?.toString(),
      sentimentLabel: req.query.sentimentLabel?.toString(),
      issueCategory: req.query.issueCategory?.toString(),
      vehicleModel: req.query.vehicleModel?.toString(),
      dateFrom: req.query.dateFrom?.toString(),
      dateTo: req.query.dateTo?.toString(),
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/language-detection/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await processPendingFeedbackLanguages(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/language-detection", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const result = await processFeedbackLanguage(req.params.id.toString());

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/sentiment-topics/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await processPendingFeedbackSentimentTopics(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/sentiment-topics", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const result = await processFeedbackSentimentTopics(req.params.id.toString());

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/issue-classification/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await processPendingFeedbackIssueClassifications(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/issue-classification", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const result = await processFeedbackIssueClassification(req.params.id.toString());

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/repeat-complaints/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await detectPendingRepeatComplaints(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/repeat-complaints", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const result = await detectRepeatComplaint(req.params.id.toString());

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/churn-risk/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await generatePendingChurnRiskScores(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/churn-risk", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const result = await generateChurnRiskScore(req.params.id.toString());

    if (!result) {
      res.status(404).json({ message: "Feedback record not found or not linked to a customer." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/urgency/run", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Number(req.body?.limit ?? req.query.limit ?? 25);
    const result = await processPendingFeedbackUrgency(Number.isFinite(limit) ? limit : 25);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/feedback/:id/urgency", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const result = await processFeedbackUrgency(req.params.id.toString());

    if (!result) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

feedbackRouter.get("/feedback/:id", requireRole(["Admin", "OemUser", "DealerUser", "Reviewer"]), async (req, res, next) => {
  try {
    const assignedDealerCode = req.user?.role === "DealerUser" ? req.user.dealerCode : undefined;
    const feedbackRecord = await getFeedbackRecordById(req.params.id.toString(), { dealerCode: assignedDealerCode });

    if (!feedbackRecord) {
      res.status(404).json({ message: "Feedback record not found." });
      return;
    }

    res.json(feedbackRecord);
  } catch (error) {
    next(error);
  }
});

