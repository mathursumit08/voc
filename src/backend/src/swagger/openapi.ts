import { env } from "../config/env.js";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: env.SWAGGER_TITLE,
    version: env.SWAGGER_VERSION,
    description: "API contract for the VoC prototype module."
  },
  servers: [
    {
      url: `/api/${env.API_VERSION}`,
      description: "Versioned API base path"
    }
  ],
  tags: [
    {
      name: "Health",
      description: "Application health and readiness endpoints"
    },
    {
      name: "Uploads",
      description: "Prototype data upload endpoints"
    },
    {
      name: "Feedback",
      description: "Normalized feedback record exploration endpoints"
    }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "API is running",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse"
                }
              }
            }
          }
        }
      }
    },
    "/uploads/feedback": {
      post: {
        tags: ["Uploads"],
        summary: "Upload feedback data",
        description:
          "Uploads a feedback file and normalizes valid rows into feedback records. Accepted file formats: .csv and .xlsx only. Required columns are sourceType, sourceReferenceId, feedbackDate, and rawText.",
        operationId: "uploadFeedback",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Accepted formats: .csv and .xlsx only."
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Upload processed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FeedbackUploadResult"
                }
              }
            }
          },
          "400": {
            description: "Invalid upload request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/feedback": {
      get: {
        tags: ["Feedback"],
        summary: "List normalized feedback records",
        description:
          "Returns feedback records with dealer, customer, and vehicle context. Use maskedText for NLP or UI preview when personal data should not be exposed.",
        operationId: "listFeedbackRecords",
        parameters: [
          {
            name: "sourceType",
            in: "query",
            schema: {
              type: "string",
              enum: ["Survey", "JobCard", "WarrantyClaim", "GoogleReview", "SocialMedia", "CallCenter", "MobileApp", "ManualUpload"]
            }
          },
          {
            name: "processingStatus",
            in: "query",
            schema: {
              type: "string",
              enum: ["Pending", "Processing", "Completed", "Failed", "NeedsReview"]
            }
          },
          {
            name: "dealerId",
            in: "query",
            schema: {
              type: "string",
              format: "uuid"
            }
          },
          {
            name: "customerId",
            in: "query",
            schema: {
              type: "string",
              format: "uuid"
            }
          },
          {
            name: "vehicleId",
            in: "query",
            schema: {
              type: "string",
              format: "uuid"
            }
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 50
            }
          },
          {
            name: "offset",
            in: "query",
            schema: {
              type: "integer",
              minimum: 0,
              default: 0
            }
          }
        ],
        responses: {
          "200": {
            description: "Feedback records returned",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FeedbackRecordListResponse"
                }
              }
            }
          },
          "400": {
            description: "Invalid filter request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/language-detection/run": {
      post: {
        tags: ["Feedback"],
        summary: "Run language detection for pending feedback",
        description:
          "Processes feedback records without NLP results. The prototype reads maskedText when available, detects English/Hindi/Tamil/Telugu, and stores translated English text for non-English feedback.",
        operationId: "runPendingFeedbackLanguageDetection",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 25
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Language detection completed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LanguageProcessingBatchResult"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/{id}/language-detection": {
      post: {
        tags: ["Feedback"],
        summary: "Run language detection for one feedback record",
        description:
          "Detects the original feedback language and stores translated English text when the record is not English.",
        operationId: "runFeedbackLanguageDetection",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Language result stored",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LanguageProcessingResult"
                }
              }
            }
          },
          "404": {
            description: "Feedback record not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/sentiment-topics/run": {
      post: {
        tags: ["Feedback"],
        summary: "Run sentiment and topic extraction for pending feedback",
        description:
          "Processes feedback records missing sentiment or topic values. The prototype uses translated English text when available, otherwise masked feedback text.",
        operationId: "runPendingFeedbackSentimentTopics",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 25
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Sentiment and topic extraction completed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SentimentTopicBatchResult"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/{id}/sentiment-topics": {
      post: {
        tags: ["Feedback"],
        summary: "Run sentiment and topic extraction for one feedback record",
        description:
          "Classifies sentiment, extracts prototype topic tags, and stores confidence/model source in the NLP result.",
        operationId: "runFeedbackSentimentTopics",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Sentiment and topic result stored",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SentimentTopicProcessingResult"
                }
              }
            }
          },
          "404": {
            description: "Feedback record not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/issue-classification/run": {
      post: {
        tags: ["Feedback"],
        summary: "Run issue classification for pending feedback",
        description:
          "Maps feedback into an automotive issue category. Low-confidence records are routed to the human review queue.",
        operationId: "runPendingFeedbackIssueClassification",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 25
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Issue classification completed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/IssueClassificationBatchResult"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/{id}/issue-classification": {
      post: {
        tags: ["Feedback"],
        summary: "Run issue classification for one feedback record",
        description:
          "Classifies the primary automotive issue category and creates a review queue item when confidence is below the prototype threshold.",
        operationId: "runFeedbackIssueClassification",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Issue classification result stored",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/IssueClassificationResult"
                }
              }
            }
          },
          "404": {
            description: "Feedback record not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/feedback/{id}": {
      get: {
        tags: ["Feedback"],
        summary: "Get feedback record details",
        description: "Returns one normalized feedback record with related dealer, customer, vehicle, job card, and warranty claim context.",
        operationId: "getFeedbackRecord",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Feedback record returned",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FeedbackRecordDetail"
                }
              }
            }
          },
          "404": {
            description: "Feedback record not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string"
          },
          acceptedFormats: {
            type: "array",
            items: {
              type: "string",
              enum: [".csv", ".xlsx"]
            },
            example: [".csv", ".xlsx"]
          }
        }
      },
      HealthResponse: {
        type: "object",
        required: ["status", "service", "version", "timestamp"],
        properties: {
          status: {
            type: "string",
            enum: ["Ok"]
          },
          service: {
            type: "string",
            example: "VoC Prototype"
          },
          version: {
            type: "string",
            example: "v1"
          },
          timestamp: {
            type: "string",
            format: "date-time"
          }
        }
      },
      FeedbackUploadRejectedRow: {
        type: "object",
        required: ["rowNumber", "reason"],
        properties: {
          rowNumber: {
            type: "integer",
            example: 4
          },
          sourceReferenceId: {
            type: "string",
            example: "FB-123"
          },
          reason: {
            type: "string",
            example: "Missing required column value(s): rawText"
          }
        }
      },
      FeedbackUploadResult: {
        type: "object",
        required: ["acceptedFormats", "totalRows", "acceptedRows", "rejectedRows", "duplicateRows", "insertedRows", "rejected"],
        properties: {
          acceptedFormats: {
            type: "array",
            items: {
              type: "string",
              enum: [".csv", ".xlsx"]
            },
            example: [".csv", ".xlsx"]
          },
          totalRows: {
            type: "integer",
            example: 100
          },
          acceptedRows: {
            type: "integer",
            example: 92
          },
          rejectedRows: {
            type: "integer",
            example: 5
          },
          duplicateRows: {
            type: "integer",
            example: 3
          },
          insertedRows: {
            type: "integer",
            example: 92
          },
          rejected: {
            type: "array",
            items: {
              $ref: "#/components/schemas/FeedbackUploadRejectedRow"
            }
          }
        }
      },
      FeedbackRecordSummary: {
        type: "object",
        required: ["id", "sourceType", "sourceReferenceId", "feedbackDate", "rawText", "maskedText", "processingStatus", "createdAt"],
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          sourceType: {
            type: "string",
            enum: ["Survey", "JobCard", "WarrantyClaim", "GoogleReview", "SocialMedia", "CallCenter", "MobileApp", "ManualUpload"]
          },
          sourceReferenceId: {
            type: "string",
            example: "SUR-2025-0001"
          },
          feedbackDate: {
            type: "string",
            format: "date-time"
          },
          rawText: {
            type: "string",
            description: "Original feedback text retained for traceability."
          },
          maskedText: {
            type: "string",
            description: "Feedback text with supported PII patterns masked for NLP and UI preview.",
            example: "Service advisor called [PhoneMasked] and confirmed pickup."
          },
          rating: {
            type: "integer",
            nullable: true,
            minimum: 1,
            maximum: 5
          },
          processingStatus: {
            type: "string",
            enum: ["Pending", "Processing", "Completed", "Failed", "NeedsReview"]
          },
          createdAt: {
            type: "string",
            format: "date-time"
          },
          dealerName: {
            type: "string",
            nullable: true
          },
          dealerCode: {
            type: "string",
            nullable: true
          },
          customerName: {
            type: "string",
            nullable: true
          },
          vehicleModel: {
            type: "string",
            nullable: true
          }
        }
      },
      FeedbackRecordListResponse: {
        type: "object",
        required: ["totalCount", "limit", "offset", "records"],
        properties: {
          totalCount: {
            type: "integer",
            example: 127
          },
          limit: {
            type: "integer",
            example: 50
          },
          offset: {
            type: "integer",
            example: 0
          },
          records: {
            type: "array",
            items: {
              $ref: "#/components/schemas/FeedbackRecordSummary"
            }
          }
        }
      },
      NlpResult: {
        type: "object",
        nullable: true,
        properties: {
          detectedLanguage: {
            type: "string",
            example: "Hindi"
          },
          translatedText: {
            type: "string",
            nullable: true,
            example: "[Prototype HI to EN] service delay issue"
          },
          sentimentLabel: {
            type: "string",
            enum: ["Positive", "Neutral", "Negative", "Mixed", "Unknown"],
            example: "Negative"
          },
          sentimentScore: {
            type: "number",
            format: "float",
            nullable: true,
            example: -0.74
          },
          topics: {
            type: "array",
            items: {
              type: "string"
            },
            example: ["RepairQuality", "DeliveryDelay"]
          },
          entities: {
            type: "object",
            nullable: true
          },
          confidenceScore: {
            type: "number",
            format: "float",
            nullable: true,
            example: 0.78
          },
          modelName: {
            type: "string",
            nullable: true,
            example: "PrototypeNlpRules"
          },
          modelVersion: {
            type: "string",
            nullable: true,
            example: "v1"
          },
          processedAt: {
            type: "string",
            format: "date-time",
            nullable: true
          }
        }
      },
      SentimentTopicProcessingResult: {
        type: "object",
        required: ["feedbackRecordId", "sentimentLabel", "sentimentScore", "topics", "confidenceScore", "processedText", "modelName", "modelVersion"],
        properties: {
          feedbackRecordId: {
            type: "string",
            format: "uuid"
          },
          sentimentLabel: {
            type: "string",
            enum: ["Positive", "Neutral", "Negative", "Mixed"]
          },
          sentimentScore: {
            type: "number",
            format: "float",
            minimum: -1,
            maximum: 1
          },
          topics: {
            type: "array",
            minItems: 1,
            items: {
              type: "string"
            },
            example: ["ServiceQuality", "Communication"]
          },
          confidenceScore: {
            type: "number",
            format: "float",
            minimum: 0,
            maximum: 1
          },
          processedText: {
            type: "string",
            description: "Translated English text when available; otherwise the masked feedback text."
          },
          modelName: {
            type: "string",
            example: "PrototypeNlpRules"
          },
          modelVersion: {
            type: "string",
            example: "v1"
          }
        }
      },
      SentimentTopicBatchResult: {
        type: "object",
        required: ["requestedLimit", "processedCount", "records"],
        properties: {
          requestedLimit: {
            type: "integer",
            example: 25
          },
          processedCount: {
            type: "integer",
            example: 16
          },
          records: {
            type: "array",
            items: {
              $ref: "#/components/schemas/SentimentTopicProcessingResult"
            }
          }
        }
      },
      IssueClassificationResult: {
        type: "object",
        required: [
          "feedbackRecordId",
          "category",
          "subCategory",
          "urgencyLevel",
          "confidenceScore",
          "explanation",
          "isPrimary",
          "routedToReview",
          "reviewQueueItemId"
        ],
        properties: {
          feedbackRecordId: {
            type: "string",
            format: "uuid"
          },
          category: {
            type: "string",
            enum: [
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
            ]
          },
          subCategory: {
            type: "string",
            example: "RepeatOrUnresolvedRepair"
          },
          urgencyLevel: {
            type: "string",
            enum: ["Low", "Medium", "High", "Critical"],
            example: "Medium"
          },
          confidenceScore: {
            type: "number",
            format: "float",
            minimum: 0,
            maximum: 1,
            example: 0.82
          },
          explanation: {
            type: "string",
            example: "The feedback refers to repair completion, repeat concern, or unresolved work."
          },
          isPrimary: {
            type: "boolean",
            example: true
          },
          routedToReview: {
            type: "boolean",
            example: false
          },
          reviewQueueItemId: {
            type: "string",
            format: "uuid",
            nullable: true
          }
        }
      },
      IssueClassificationDetail: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          category: {
            type: "string",
            enum: [
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
            ]
          },
          subCategory: {
            type: "string",
            nullable: true
          },
          urgencyLevel: {
            type: "string",
            enum: ["Low", "Medium", "High", "Critical"]
          },
          confidenceScore: {
            type: "number",
            format: "float",
            nullable: true
          },
          explanation: {
            type: "string",
            nullable: true
          },
          isPrimary: {
            type: "boolean"
          },
          createdAt: {
            type: "string",
            format: "date-time"
          }
        }
      },
      IssueClassificationBatchResult: {
        type: "object",
        required: ["requestedLimit", "processedCount", "records"],
        properties: {
          requestedLimit: {
            type: "integer",
            example: 25
          },
          processedCount: {
            type: "integer",
            example: 16
          },
          records: {
            type: "array",
            items: {
              $ref: "#/components/schemas/IssueClassificationResult"
            }
          }
        }
      },
      ReviewQueueItem: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid"
          },
          status: {
            type: "string",
            enum: ["Open", "InReview", "Resolved", "Dismissed"]
          },
          reason: {
            type: "string"
          },
          assignedTo: {
            type: "string",
            nullable: true
          },
          createdAt: {
            type: "string",
            format: "date-time"
          }
        }
      },
      LanguageProcessingResult: {
        type: "object",
        required: ["feedbackRecordId", "detectedLanguage", "translatedText", "confidenceScore", "processedText"],
        properties: {
          feedbackRecordId: {
            type: "string",
            format: "uuid"
          },
          detectedLanguage: {
            type: "string",
            enum: ["English", "Hindi", "Tamil", "Telugu"]
          },
          translatedText: {
            type: "string",
            nullable: true,
            description: "English translation for non-English records. English records return null."
          },
          confidenceScore: {
            type: "number",
            format: "float",
            minimum: 0,
            maximum: 1
          },
          processedText: {
            type: "string",
            description: "Translated English text when available; otherwise the masked feedback text."
          }
        }
      },
      LanguageProcessingBatchResult: {
        type: "object",
        required: ["requestedLimit", "processedCount", "records"],
        properties: {
          requestedLimit: {
            type: "integer",
            example: 25
          },
          processedCount: {
            type: "integer",
            example: 16
          },
          records: {
            type: "array",
            items: {
              $ref: "#/components/schemas/LanguageProcessingResult"
            }
          }
        }
      },
      FeedbackRecordDetail: {
        allOf: [
          {
            $ref: "#/components/schemas/FeedbackRecordSummary"
          },
          {
            type: "object",
            properties: {
              processingError: {
                type: "string",
                nullable: true
              },
              updatedAt: {
                type: "string",
                format: "date-time"
              },
              dealer: {
                type: "object",
                nullable: true
              },
              customer: {
                type: "object",
                nullable: true
              },
              vehicle: {
                type: "object",
                nullable: true
              },
              jobCard: {
                type: "object",
                nullable: true
              },
              warrantyClaim: {
                type: "object",
                nullable: true
              },
              nlpResult: {
                $ref: "#/components/schemas/NlpResult"
              },
              issueClassifications: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/IssueClassificationDetail"
                }
              },
              reviewItems: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/ReviewQueueItem"
                }
              }
            }
          }
        ]
      }
    }
  }
} as const;

