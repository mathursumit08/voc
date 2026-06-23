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
    }
  },
  components: {
    schemas: {
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
      }
    }
  }
} as const;

