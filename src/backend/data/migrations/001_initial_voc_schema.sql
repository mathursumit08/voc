-- Initial VoC schema migration.
-- Generated from src/backend/data/models/schema.prisma.
-- Do not execute this migration unless explicitly requested.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "FeedbackSourceType" AS ENUM (
  'Survey',
  'JobCard',
  'WarrantyClaim',
  'GoogleReview',
  'SocialMedia',
  'CallCenter',
  'MobileApp',
  'ManualUpload'
);

CREATE TYPE "ProcessingStatus" AS ENUM (
  'Pending',
  'Processing',
  'Completed',
  'Failed',
  'NeedsReview'
);

CREATE TYPE "SentimentLabel" AS ENUM (
  'Positive',
  'Neutral',
  'Negative',
  'Mixed',
  'Unknown'
);

CREATE TYPE "IssueCategory" AS ENUM (
  'ServiceQuality',
  'RepairQuality',
  'StaffBehavior',
  'PriceTransparency',
  'PartsAvailability',
  'WarrantyConcern',
  'VehicleQuality',
  'DeliveryDelay',
  'FacilityExperience',
  'DigitalExperience',
  'Other'
);

CREATE TYPE "UrgencyLevel" AS ENUM (
  'Low',
  'Medium',
  'High',
  'Critical'
);

CREATE TYPE "ChurnRiskLevel" AS ENUM (
  'Low',
  'Medium',
  'High',
  'Critical'
);

CREATE TYPE "SignalStatus" AS ENUM (
  'Open',
  'UnderReview',
  'Escalated',
  'Closed'
);

CREATE TYPE "CrmTaskStatus" AS ENUM (
  'Open',
  'InProgress',
  'Closed',
  'Cancelled'
);

CREATE TYPE "ReviewQueueStatus" AS ENUM (
  'Open',
  'InReview',
  'Resolved',
  'Dismissed'
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  masked_name TEXT,
  masked_phone TEXT,
  masked_email TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vin_hash TEXT UNIQUE,
  registration_no TEXT,
  model TEXT NOT NULL,
  variant TEXT,
  model_year INTEGER,
  purchase_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  dealer_id UUID NOT NULL REFERENCES dealers(id),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  service_type TEXT,
  technician_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  dealer_id UUID NOT NULL REFERENCES dealers(id),
  claim_date TIMESTAMPTZ NOT NULL,
  part_code TEXT,
  part_name TEXT,
  claim_category TEXT,
  description TEXT,
  amount NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type "FeedbackSourceType" NOT NULL,
  source_reference_id TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  dealer_id UUID REFERENCES dealers(id),
  job_card_id UUID REFERENCES job_cards(id),
  warranty_claim_id UUID REFERENCES warranty_claims(id),
  feedback_date TIMESTAMPTZ NOT NULL,
  raw_text TEXT NOT NULL,
  masked_text TEXT,
  rating INTEGER,
  processing_status "ProcessingStatus" NOT NULL DEFAULT 'Pending',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feedback_records_source_unique UNIQUE (source_type, source_reference_id)
);

CREATE TABLE nlp_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_record_id UUID NOT NULL UNIQUE REFERENCES feedback_records(id),
  detected_language TEXT NOT NULL,
  translated_text TEXT,
  sentiment_label "SentimentLabel" NOT NULL DEFAULT 'Unknown',
  sentiment_score NUMERIC(5, 4),
  topics TEXT[] NOT NULL,
  entities JSONB,
  model_name TEXT,
  model_version TEXT,
  confidence_score NUMERIC(5, 4),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE issue_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_record_id UUID NOT NULL REFERENCES feedback_records(id),
  category "IssueCategory" NOT NULL,
  sub_category TEXT,
  urgency_level "UrgencyLevel" NOT NULL DEFAULT 'Low',
  confidence_score NUMERIC(5, 4),
  explanation TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE churn_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  feedback_record_id UUID REFERENCES feedback_records(id),
  score NUMERIC(5, 2) NOT NULL,
  risk_level "ChurnRiskLevel" NOT NULL,
  reason_summary TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dealer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  csi_score NUMERIC(6, 2),
  nps_score NUMERIC(6, 2),
  sentiment_score NUMERIC(5, 4),
  retention_rate NUMERIC(5, 4),
  open_escalations INTEGER NOT NULL DEFAULT 0,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_scores_period_unique UNIQUE (dealer_id, period_start, period_end)
);

CREATE TABLE warranty_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id),
  warranty_claim_id UUID REFERENCES warranty_claims(id),
  feedback_record_id UUID REFERENCES feedback_records(id),
  model TEXT,
  part_code TEXT,
  issue_category "IssueCategory",
  signal_score NUMERIC(5, 2),
  status "SignalStatus" NOT NULL DEFAULT 'Open',
  supporting_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_record_id UUID NOT NULL REFERENCES feedback_records(id),
  customer_id UUID REFERENCES customers(id),
  dealer_id UUID REFERENCES dealers(id),
  title TEXT NOT NULL,
  description TEXT,
  priority "UrgencyLevel" NOT NULL DEFAULT 'Medium',
  status "CrmTaskStatus" NOT NULL DEFAULT 'Open',
  due_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_record_id UUID NOT NULL REFERENCES feedback_records(id),
  status "ReviewQueueStatus" NOT NULL DEFAULT 'Open',
  reason TEXT NOT NULL,
  assigned_to TEXT,
  reviewer_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup and dashboard indexes mirror the Prisma model annotations.
CREATE INDEX customers_state_city_idx ON customers(state, city);

CREATE INDEX vehicles_customer_id_idx ON vehicles(customer_id);
CREATE INDEX vehicles_model_variant_idx ON vehicles(model, variant);
CREATE INDEX vehicles_purchase_date_idx ON vehicles(purchase_date);

CREATE INDEX dealers_region_idx ON dealers(region);
CREATE INDEX dealers_state_city_idx ON dealers(state, city);
CREATE INDEX dealers_is_active_idx ON dealers(is_active);

CREATE INDEX job_cards_customer_id_opened_at_idx ON job_cards(customer_id, opened_at);
CREATE INDEX job_cards_vehicle_id_opened_at_idx ON job_cards(vehicle_id, opened_at);
CREATE INDEX job_cards_dealer_id_opened_at_idx ON job_cards(dealer_id, opened_at);
CREATE INDEX job_cards_closed_at_idx ON job_cards(closed_at);

CREATE INDEX warranty_claims_customer_id_claim_date_idx ON warranty_claims(customer_id, claim_date);
CREATE INDEX warranty_claims_vehicle_id_claim_date_idx ON warranty_claims(vehicle_id, claim_date);
CREATE INDEX warranty_claims_dealer_id_claim_date_idx ON warranty_claims(dealer_id, claim_date);
CREATE INDEX warranty_claims_part_code_idx ON warranty_claims(part_code);
CREATE INDEX warranty_claims_claim_category_idx ON warranty_claims(claim_category);

CREATE INDEX feedback_records_processing_status_feedback_date_idx ON feedback_records(processing_status, feedback_date);
CREATE INDEX feedback_records_source_type_feedback_date_idx ON feedback_records(source_type, feedback_date);
CREATE INDEX feedback_records_dealer_id_feedback_date_idx ON feedback_records(dealer_id, feedback_date);
CREATE INDEX feedback_records_customer_id_feedback_date_idx ON feedback_records(customer_id, feedback_date);
CREATE INDEX feedback_records_vehicle_id_feedback_date_idx ON feedback_records(vehicle_id, feedback_date);
CREATE INDEX feedback_records_job_card_id_idx ON feedback_records(job_card_id);
CREATE INDEX feedback_records_warranty_claim_id_idx ON feedback_records(warranty_claim_id);

CREATE INDEX nlp_results_sentiment_label_idx ON nlp_results(sentiment_label);
CREATE INDEX nlp_results_detected_language_idx ON nlp_results(detected_language);
CREATE INDEX nlp_results_processed_at_idx ON nlp_results(processed_at);

CREATE INDEX issue_classifications_feedback_record_id_idx ON issue_classifications(feedback_record_id);
CREATE INDEX issue_classifications_category_urgency_level_idx ON issue_classifications(category, urgency_level);
CREATE INDEX issue_classifications_urgency_level_idx ON issue_classifications(urgency_level);

CREATE INDEX churn_scores_customer_id_scored_at_idx ON churn_scores(customer_id, scored_at);
CREATE INDEX churn_scores_vehicle_id_scored_at_idx ON churn_scores(vehicle_id, scored_at);
CREATE INDEX churn_scores_risk_level_scored_at_idx ON churn_scores(risk_level, scored_at);

CREATE INDEX dealer_scores_period_start_period_end_idx ON dealer_scores(period_start, period_end);
CREATE INDEX dealer_scores_csi_score_idx ON dealer_scores(csi_score);
CREATE INDEX dealer_scores_nps_score_idx ON dealer_scores(nps_score);

CREATE INDEX warranty_signals_status_detected_at_idx ON warranty_signals(status, detected_at);
CREATE INDEX warranty_signals_model_part_code_idx ON warranty_signals(model, part_code);
CREATE INDEX warranty_signals_dealer_id_detected_at_idx ON warranty_signals(dealer_id, detected_at);
CREATE INDEX warranty_signals_issue_category_idx ON warranty_signals(issue_category);

CREATE INDEX crm_tasks_status_due_at_idx ON crm_tasks(status, due_at);
CREATE INDEX crm_tasks_priority_status_idx ON crm_tasks(priority, status);
CREATE INDEX crm_tasks_dealer_id_status_idx ON crm_tasks(dealer_id, status);
CREATE INDEX crm_tasks_customer_id_idx ON crm_tasks(customer_id);

CREATE INDEX human_review_queue_status_created_at_idx ON human_review_queue(status, created_at);
CREATE INDEX human_review_queue_assigned_to_status_idx ON human_review_queue(assigned_to, status);
CREATE INDEX human_review_queue_feedback_record_id_idx ON human_review_queue(feedback_record_id);

