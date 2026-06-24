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
      }
    }
  }
} as const;

