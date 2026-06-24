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
              }
            }
          }
        ]
      }
    }
  }
} as const;

