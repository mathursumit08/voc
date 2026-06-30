import { Router } from "express";
import { requireRole } from "../../auth/middleware.js";
import { listReviewQueueItems, resolveReviewQueueItem } from "../../review/reviewQueueService.js";

const validStatuses = new Set(["Open", "InReview", "Resolved", "Dismissed"]);
const validSentiments = new Set(["Positive", "Neutral", "Negative", "Mixed", "Unknown"]);
const validIssues = new Set([
  "ServiceQuality",
  "RepairQuality",
  "StaffBehavior",
  "PriceTransparency",
  "PartsAvailability",
  "WarrantyConcern",
  "VehicleQuality",
  "DeliveryDelay",
  "FacilityExperience",
  "DigitalExperience",
  "Other"
]);
const validUrgencies = new Set(["Low", "Medium", "High", "Critical"]);

export const reviewRouter = Router();

reviewRouter.get("/review-queue", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 25), 100);
    const offset = Number(req.query.offset ?? 0);
    const status = req.query.status?.toString();

    if (status && !validStatuses.has(status)) {
      res.status(400).json({ message: `Invalid review queue status: ${status}` });
      return;
    }

    const result = await listReviewQueueItems({
      status: status as undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewRouter.patch("/review-queue/:id/resolve", requireRole(["Admin", "OemUser", "Reviewer"]), async (req, res, next) => {
  try {
    const reviewerNotes = req.body?.reviewerNotes?.toString().trim();
    const sentimentLabel = req.body?.sentimentLabel?.toString();
    const issueCategory = req.body?.issueCategory?.toString();
    const urgencyLevel = req.body?.urgencyLevel?.toString();

    if (!reviewerNotes) {
      res.status(400).json({ message: "reviewerNotes is required to resolve a review item." });
      return;
    }

    if (!validSentiments.has(sentimentLabel) || !validIssues.has(issueCategory) || !validUrgencies.has(urgencyLevel)) {
      res.status(400).json({ message: "Valid sentimentLabel, issueCategory, and urgencyLevel are required." });
      return;
    }

    const result = await resolveReviewQueueItem({
      reviewItemId: req.params.id.toString(),
      sentimentLabel: sentimentLabel as never,
      topics: Array.isArray(req.body?.topics) ? req.body.topics.map((topic: unknown) => String(topic).trim()).filter(Boolean) : [],
      issueCategory: issueCategory as never,
      urgencyLevel: urgencyLevel as never,
      reviewerNotes,
      assignedTo: req.user?.username ?? "reviewer"
    });

    if (!result) {
      res.status(404).json({ message: "Open review queue item not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});
