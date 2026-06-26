-- Repeat complaint signal migration for VOC-014.
-- Do not execute this migration unless explicitly requested.

CREATE TABLE IF NOT EXISTS repeat_complaint_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_record_id UUID NOT NULL UNIQUE REFERENCES feedback_records(id),
  customer_id UUID REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  lookback_days INTEGER NOT NULL,
  repeat_count INTEGER NOT NULL DEFAULT 0,
  matching_feedback_record_ids UUID[] NOT NULL DEFAULT '{}',
  is_repeat BOOLEAN NOT NULL DEFAULT false,
  reason_summary TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repeat_complaint_signals_customer_detected_idx
  ON repeat_complaint_signals(customer_id, detected_at);

CREATE INDEX IF NOT EXISTS repeat_complaint_signals_vehicle_detected_idx
  ON repeat_complaint_signals(vehicle_id, detected_at);

CREATE INDEX IF NOT EXISTS repeat_complaint_signals_repeat_detected_idx
  ON repeat_complaint_signals(is_repeat, detected_at);

CREATE INDEX IF NOT EXISTS repeat_complaint_signals_repeat_count_idx
  ON repeat_complaint_signals(repeat_count);
