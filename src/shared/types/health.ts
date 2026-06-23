export type HealthStatus = "Ok";

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: "v1";
  timestamp: string;
}

