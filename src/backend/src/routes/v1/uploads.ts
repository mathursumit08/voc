import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { uploadFeedbackFile } from "../../uploads/feedbackUploadService.js";

const supportedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
const acceptedFormats = [".csv", ".xlsx"] as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const hasSupportedExtension = /\.(csv|xlsx)$/i.test(file.originalname);

    if (supportedMimeTypes.has(file.mimetype) || hasSupportedExtension) {
      callback(null, true);
      return;
    }

    callback(new Error(`Unsupported file type. Accepted formats: ${acceptedFormats.join(", ")}.`));
  }
});

export const uploadsRouter = Router();

uploadsRouter.post("/uploads/feedback", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({
        message: "Missing upload file. Submit the file using multipart field name 'file'.",
        acceptedFormats
      });
      return;
    }

    const result = await uploadFeedbackFile(req.file);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
