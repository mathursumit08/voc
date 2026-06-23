-- VOC-003 prototype seed data.
-- This script is resettable: it clears prototype tables and reloads demo data.
-- Run explicitly with: npm run seed:prototype --workspace @voc/backend

BEGIN;

TRUNCATE TABLE
  human_review_queue,
  crm_tasks,
  warranty_signals,
  dealer_scores,
  churn_scores,
  issue_classifications,
  nlp_results,
  feedback_records,
  warranty_claims,
  job_cards,
  vehicles,
  customers,
  dealers
RESTART IDENTITY CASCADE;

INSERT INTO dealers (external_id, name, code, region, city, state, is_active)
VALUES
  ('DLR-001', 'AutoTech Motors', 'AT-BLR-001', 'South', 'Bengaluru', 'Karnataka', true),
  ('DLR-002', 'Prestige AutoHouse', 'PA-MUM-002', 'West', 'Mumbai', 'Maharashtra', true),
  ('DLR-003', 'Capital Auto Hub', 'CAH-DEL-003', 'North', 'New Delhi', 'Delhi', true),
  ('DLR-004', 'Sunrise Motors', 'SM-HYD-004', 'South', 'Hyderabad', 'Telangana', true),
  ('DLR-005', 'Elite Autoworks', 'EA-CHE-005', 'South', 'Chennai', 'Tamil Nadu', true),
  ('DLR-006', 'Metro Wheels', 'MW-PUN-006', 'West', 'Pune', 'Maharashtra', true),
  ('DLR-007', 'Northstar Automobiles', 'NA-LKO-007', 'North', 'Lucknow', 'Uttar Pradesh', true),
  ('DLR-008', 'Eastern Drive', 'ED-KOL-008', 'East', 'Kolkata', 'West Bengal', true),
  ('DLR-009', 'Coastal Cars', 'CC-KOC-009', 'South', 'Kochi', 'Kerala', true),
  ('DLR-010', 'Highway Motors', 'HM-AHM-010', 'West', 'Ahmedabad', 'Gujarat', true),
  ('DLR-011', 'Royal Auto Gallery', 'RAG-JAI-011', 'North', 'Jaipur', 'Rajasthan', true),
  ('DLR-012', 'Urban Mobility Motors', 'UMM-NOI-012', 'North', 'Noida', 'Uttar Pradesh', true),
  ('DLR-013', 'Greenline Automobiles', 'GA-CMB-013', 'South', 'Coimbatore', 'Tamil Nadu', true),
  ('DLR-014', 'Galaxy Auto Center', 'GAC-IND-014', 'Central', 'Indore', 'Madhya Pradesh', true),
  ('DLR-015', 'Silverline Motors', 'SLM-NAG-015', 'Central', 'Nagpur', 'Maharashtra', true),
  ('DLR-016', 'Heritage AutoWorks', 'HAW-CHD-016', 'North', 'Chandigarh', 'Chandigarh', true),
  ('DLR-017', 'BluePeak Motors', 'BPM-VIZ-017', 'South', 'Visakhapatnam', 'Andhra Pradesh', true),
  ('DLR-018', 'Prime Auto Point', 'PAP-SUR-018', 'West', 'Surat', 'Gujarat', true),
  ('DLR-019', 'Orbit Cars', 'OC-BBS-019', 'East', 'Bhubaneswar', 'Odisha', true),
  ('DLR-020', 'Velocity Auto', 'VA-GUR-020', 'North', 'Gurugram', 'Haryana', true),
  ('DLR-021', 'Lakecity Motors', 'LCM-BHO-021', 'Central', 'Bhopal', 'Madhya Pradesh', true),
  ('DLR-022', 'Crown AutoMall', 'CAM-LUD-022', 'North', 'Ludhiana', 'Punjab', true),
  ('DLR-023', 'Sapphire Motors', 'SAM-MYS-023', 'South', 'Mysuru', 'Karnataka', true),
  ('DLR-024', 'Riverfront Auto', 'RFA-PAT-024', 'East', 'Patna', 'Bihar', true),
  ('DLR-025', 'Expressway Cars', 'EWC-FBD-025', 'North', 'Faridabad', 'Haryana', true),
  ('DLR-026', 'Pioneer AutoWorld', 'PAW-RAN-026', 'East', 'Ranchi', 'Jharkhand', true),
  ('DLR-027', 'Trident Motors', 'TM-RAI-027', 'Central', 'Raipur', 'Chhattisgarh', true),
  ('DLR-028', 'Everest Automotive', 'EVA-DDN-028', 'North', 'Dehradun', 'Uttarakhand', true),
  ('DLR-029', 'Pearl City Motors', 'PCM-VIJ-029', 'South', 'Vijayawada', 'Andhra Pradesh', true),
  ('DLR-030', 'Western Auto Hub', 'WAH-VAD-030', 'West', 'Vadodara', 'Gujarat', true),
  ('DLR-031', 'Classic Cars', 'CLC-AMR-031', 'North', 'Amritsar', 'Punjab', true),
  ('DLR-032', 'Sundaram Auto Zone', 'SAZ-MDU-032', 'South', 'Madurai', 'Tamil Nadu', true),
  ('DLR-033', 'NexaDrive Motors', 'NDM-THA-033', 'West', 'Thane', 'Maharashtra', true),
  ('DLR-034', 'Utkal AutoMart', 'UAM-CTC-034', 'East', 'Cuttack', 'Odisha', true),
  ('DLR-035', 'Platinum Auto', 'PLA-GHA-035', 'North', 'Ghaziabad', 'Uttar Pradesh', true),
  ('DLR-036', 'Southern Star Cars', 'SSC-TRV-036', 'South', 'Thiruvananthapuram', 'Kerala', true),
  ('DLR-037', 'Desert Drive Motors', 'DDM-JOD-037', 'North', 'Jodhpur', 'Rajasthan', true),
  ('DLR-038', 'Central Auto Plaza', 'CAP-JAB-038', 'Central', 'Jabalpur', 'Madhya Pradesh', true),
  ('DLR-039', 'Seaside Automobiles', 'SEA-MNG-039', 'South', 'Mangaluru', 'Karnataka', true),
  ('DLR-040', 'Rapid Wheels', 'RW-NAS-040', 'West', 'Nashik', 'Maharashtra', true),
  ('DLR-041', 'Horizon Motors', 'HZM-GUW-041', 'East', 'Guwahati', 'Assam', true),
  ('DLR-042', 'Cityline Auto', 'CLA-KAN-042', 'North', 'Kanpur', 'Uttar Pradesh', true),
  ('DLR-043', 'Vibrant Cars', 'VBC-RAJ-043', 'West', 'Rajkot', 'Gujarat', true),
  ('DLR-044', 'Eastern Vista Motors', 'EVM-SIL-044', 'East', 'Siliguri', 'West Bengal', true),
  ('DLR-045', 'Hillview Automobiles', 'HVA-SHI-045', 'North', 'Shimla', 'Himachal Pradesh', true),
  ('DLR-046', 'Kaveri AutoWorks', 'KAW-TIR-046', 'South', 'Tiruchirappalli', 'Tamil Nadu', true),
  ('DLR-047', 'Golden Mile Motors', 'GMM-KOL-047', 'East', 'Kolkata', 'West Bengal', true),
  ('DLR-048', 'TechPark Cars', 'TPC-BLR-048', 'South', 'Bengaluru', 'Karnataka', true),
  ('DLR-049', 'Marine Drive Auto', 'MDA-MUM-049', 'West', 'Mumbai', 'Maharashtra', true),
  ('DLR-050', 'Capital Express Motors', 'CEM-DEL-050', 'North', 'New Delhi', 'Delhi', true);

INSERT INTO customers (external_id, masked_name, masked_phone, masked_email, city, state)
VALUES
  ('CUST-001', 'Customer Bengaluru 001', 'XXXXXX2101', 'customer001@example.invalid', 'Bengaluru', 'Karnataka'),
  ('CUST-002', 'Customer Mumbai 002', 'XXXXXX2102', 'customer002@example.invalid', 'Mumbai', 'Maharashtra'),
  ('CUST-003', 'Customer Delhi 003', 'XXXXXX2103', 'customer003@example.invalid', 'New Delhi', 'Delhi'),
  ('CUST-004', 'Customer Hyderabad 004', 'XXXXXX2104', 'customer004@example.invalid', 'Hyderabad', 'Telangana'),
  ('CUST-005', 'Customer Chennai 005', 'XXXXXX2105', 'customer005@example.invalid', 'Chennai', 'Tamil Nadu'),
  ('CUST-006', 'Customer Pune 006', 'XXXXXX2106', 'customer006@example.invalid', 'Pune', 'Maharashtra'),
  ('CUST-007', 'Customer Jaipur 007', 'XXXXXX2107', 'customer007@example.invalid', 'Jaipur', 'Rajasthan'),
  ('CUST-008', 'Customer Kolkata 008', 'XXXXXX2108', 'customer008@example.invalid', 'Kolkata', 'West Bengal'),
  ('CUST-009', 'Customer Kochi 009', 'XXXXXX2109', 'customer009@example.invalid', 'Kochi', 'Kerala'),
  ('CUST-010', 'Customer Ahmedabad 010', 'XXXXXX2110', 'customer010@example.invalid', 'Ahmedabad', 'Gujarat'),
  ('CUST-011', 'Customer Noida 011', 'XXXXXX2111', 'customer011@example.invalid', 'Noida', 'Uttar Pradesh'),
  ('CUST-012', 'Customer Coimbatore 012', 'XXXXXX2112', 'customer012@example.invalid', 'Coimbatore', 'Tamil Nadu'),
  ('CUST-013', 'Customer Indore 013', 'XXXXXX2113', 'customer013@example.invalid', 'Indore', 'Madhya Pradesh'),
  ('CUST-014', 'Customer Nagpur 014', 'XXXXXX2114', 'customer014@example.invalid', 'Nagpur', 'Maharashtra'),
  ('CUST-015', 'Customer Gurugram 015', 'XXXXXX2115', 'customer015@example.invalid', 'Gurugram', 'Haryana'),
  ('CUST-016', 'Customer Mysuru 016', 'XXXXXX2116', 'customer016@example.invalid', 'Mysuru', 'Karnataka');

INSERT INTO vehicles (customer_id, vin_hash, registration_no, model, variant, model_year, purchase_date)
SELECT c.id, v.vin_hash, v.registration_no, v.model, v.variant, v.model_year, v.purchase_date::timestamptz
FROM (
  VALUES
    ('CUST-001', 'VINHASH-001', 'KA-01-XX-2101', 'Astra X', 'ZX Petrol', 2023, '2023-04-14'),
    ('CUST-002', 'VINHASH-002', 'MH-02-XX-2102', 'Prism EV', 'Long Range', 2024, '2024-01-20'),
    ('CUST-003', 'VINHASH-003', 'DL-03-XX-2103', 'Urban Cruiser', 'VX Diesel', 2022, '2022-11-02'),
    ('CUST-004', 'VINHASH-004', 'TS-04-XX-2104', 'Astra X', 'ZX Petrol', 2023, '2023-07-18'),
    ('CUST-005', 'VINHASH-005', 'TN-05-XX-2105', 'Nexa Prime', 'Hybrid Plus', 2024, '2024-02-11'),
    ('CUST-006', 'VINHASH-006', 'MH-06-XX-2106', 'Prism EV', 'Standard', 2023, '2023-09-09'),
    ('CUST-007', 'VINHASH-007', 'RJ-07-XX-2107', 'Urban Cruiser', 'VX Diesel', 2021, '2021-12-27'),
    ('CUST-008', 'VINHASH-008', 'WB-08-XX-2108', 'Astra X', 'LX Petrol', 2022, '2022-08-23'),
    ('CUST-009', 'VINHASH-009', 'KL-09-XX-2109', 'Nexa Prime', 'Hybrid Plus', 2024, '2024-03-04'),
    ('CUST-010', 'VINHASH-010', 'GJ-10-XX-2110', 'Prism EV', 'Long Range', 2023, '2023-06-30'),
    ('CUST-011', 'VINHASH-011', 'UP-11-XX-2111', 'Urban Cruiser', 'VX Diesel', 2022, '2022-10-10'),
    ('CUST-012', 'VINHASH-012', 'TN-12-XX-2112', 'Astra X', 'ZX Petrol', 2024, '2024-04-19'),
    ('CUST-013', 'VINHASH-013', 'MP-13-XX-2113', 'Nexa Prime', 'Hybrid', 2021, '2021-05-17'),
    ('CUST-014', 'VINHASH-014', 'MH-14-XX-2114', 'Urban Cruiser', 'VX Diesel', 2023, '2023-12-05'),
    ('CUST-015', 'VINHASH-015', 'HR-15-XX-2115', 'Prism EV', 'Long Range', 2024, '2024-05-01'),
    ('CUST-016', 'VINHASH-016', 'KA-16-XX-2116', 'Astra X', 'LX Petrol', 2022, '2022-03-21')
) AS v(customer_external_id, vin_hash, registration_no, model, variant, model_year, purchase_date)
JOIN customers c ON c.external_id = v.customer_external_id;

INSERT INTO job_cards (external_id, customer_id, vehicle_id, dealer_id, opened_at, closed_at, service_type, technician_notes)
SELECT jc.external_id, c.id, v.id, d.id, jc.opened_at::timestamptz, jc.closed_at::timestamptz, jc.service_type, jc.technician_notes
FROM (
  VALUES
    ('JC-001', 'CUST-001', 'VINHASH-001', 'AT-BLR-001', '2026-01-12 09:30:00+05:30', '2026-01-12 17:45:00+05:30', 'Periodic Maintenance', 'Customer reported brake noise; front brake pads cleaned and road tested.'),
    ('JC-002', 'CUST-002', 'VINHASH-002', 'PA-MUM-002', '2026-01-18 10:10:00+05:30', '2026-01-18 18:20:00+05:30', 'EV Service', 'Battery health check completed; software update applied.'),
    ('JC-003', 'CUST-003', 'VINHASH-003', 'CAH-DEL-003', '2026-02-03 11:00:00+05:30', '2026-02-04 14:30:00+05:30', 'Repair', 'AC cooling concern verified; refrigerant topped up and leak test passed.'),
    ('JC-004', 'CUST-004', 'VINHASH-004', 'SM-HYD-004', '2026-02-11 09:00:00+05:30', '2026-02-11 16:15:00+05:30', 'Periodic Maintenance', 'Engine oil and filters replaced. Customer asked for quicker billing next visit.'),
    ('JC-005', 'CUST-005', 'VINHASH-005', 'EA-CHE-005', '2026-02-25 12:20:00+05:30', '2026-02-26 13:10:00+05:30', 'Warranty Inspection', 'Hybrid warning lamp intermittent; diagnostic scan captured DTC.'),
    ('JC-006', 'CUST-006', 'VINHASH-006', 'MW-PUN-006', '2026-03-04 10:00:00+05:30', '2026-03-04 17:00:00+05:30', 'EV Service', 'Charging port flap alignment adjusted.'),
    ('JC-007', 'CUST-007', 'VINHASH-007', 'RAG-JAI-011', '2026-03-16 09:40:00+05:30', '2026-03-17 15:50:00+05:30', 'Repair', 'Suspension rattle checked; lower arm bush replacement advised.'),
    ('JC-008', 'CUST-008', 'VINHASH-008', 'ED-KOL-008', '2026-03-28 11:25:00+05:30', '2026-03-28 19:00:00+05:30', 'Periodic Maintenance', 'Washer fluid topped up; service advisor explained estimate.'),
    ('JC-009', 'CUST-009', 'VINHASH-009', 'CC-KOC-009', '2026-04-08 09:15:00+05:30', '2026-04-08 16:45:00+05:30', 'Warranty Inspection', 'Infotainment screen flicker observed during inspection.'),
    ('JC-010', 'CUST-010', 'VINHASH-010', 'HM-AHM-010', '2026-04-19 10:30:00+05:30', '2026-04-19 18:05:00+05:30', 'EV Service', 'Range concern reviewed; tyre pressure and battery calibration completed.'),
    ('JC-011', 'CUST-011', 'VINHASH-011', 'UMM-NOI-012', '2026-05-02 09:50:00+05:30', '2026-05-03 12:40:00+05:30', 'Repair', 'Repeat complaint for steering vibration; wheel balancing done.'),
    ('JC-012', 'CUST-012', 'VINHASH-012', 'GA-CMB-013', '2026-05-14 10:15:00+05:30', '2026-05-14 16:30:00+05:30', 'Periodic Maintenance', 'Service completed early; customer appreciated pickup and drop.'),
    ('JC-013', 'CUST-013', 'VINHASH-013', 'GAC-IND-014', '2026-05-21 11:05:00+05:30', '2026-05-22 14:20:00+05:30', 'Repair', 'Noise from dashboard inspected; clips tightened.'),
    ('JC-014', 'CUST-014', 'VINHASH-014', 'SLM-NAG-015', '2026-06-01 09:35:00+05:30', '2026-06-01 18:15:00+05:30', 'Periodic Maintenance', 'Customer raised price transparency concern on consumables.'),
    ('JC-015', 'CUST-015', 'VINHASH-015', 'VA-GUR-020', '2026-06-09 10:45:00+05:30', '2026-06-10 13:00:00+05:30', 'EV Service', 'Charging speed concern under review; cable inspection passed.'),
    ('JC-016', 'CUST-016', 'VINHASH-016', 'SAM-MYS-023', '2026-06-15 09:10:00+05:30', '2026-06-15 15:25:00+05:30', 'Periodic Maintenance', 'Routine service completed; no additional repair found.')
) AS jc(external_id, customer_external_id, vin_hash, dealer_code, opened_at, closed_at, service_type, technician_notes)
JOIN customers c ON c.external_id = jc.customer_external_id
JOIN vehicles v ON v.vin_hash = jc.vin_hash
JOIN dealers d ON d.code = jc.dealer_code;

INSERT INTO warranty_claims (external_id, customer_id, vehicle_id, dealer_id, claim_date, part_code, part_name, claim_category, description, amount)
SELECT wc.external_id, c.id, v.id, d.id, wc.claim_date::timestamptz, wc.part_code, wc.part_name, wc.claim_category, wc.description, wc.amount::numeric
FROM (
  VALUES
    ('WC-001', 'CUST-002', 'VINHASH-002', 'PA-MUM-002', '2026-01-18', 'EV-BMS-14', 'Battery Management Module', 'Electrical', 'BMS software fault during routine EV service.', 18450.00),
    ('WC-002', 'CUST-003', 'VINHASH-003', 'CAH-DEL-003', '2026-02-04', 'AC-COND-07', 'AC Condenser', 'HVAC', 'Low cooling due to condenser leak.', 22600.00),
    ('WC-003', 'CUST-005', 'VINHASH-005', 'EA-CHE-005', '2026-02-26', 'HYB-INV-03', 'Hybrid Inverter Sensor', 'Electrical', 'Intermittent hybrid warning lamp.', 31250.00),
    ('WC-004', 'CUST-007', 'VINHASH-007', 'RAG-JAI-011', '2026-03-17', 'SUS-BSH-02', 'Lower Arm Bush', 'Suspension', 'Premature suspension bush wear.', 9250.00),
    ('WC-005', 'CUST-009', 'VINHASH-009', 'CC-KOC-009', '2026-04-08', 'INF-DSP-11', 'Infotainment Display', 'Infotainment', 'Screen flicker confirmed during inspection.', 28400.00),
    ('WC-006', 'CUST-010', 'VINHASH-010', 'HM-AHM-010', '2026-04-19', 'EV-CHG-05', 'Charging Control Unit', 'Electrical', 'Charging calibration concern.', 19600.00),
    ('WC-007', 'CUST-011', 'VINHASH-011', 'UMM-NOI-012', '2026-05-03', 'STR-RCK-01', 'Steering Rack', 'Steering', 'Repeat vibration complaint after balancing.', 41200.00),
    ('WC-008', 'CUST-013', 'VINHASH-013', 'GAC-IND-014', '2026-05-22', 'INT-CLP-09', 'Dashboard Clip Kit', 'Interior', 'Dashboard noise due to loose clips.', 2200.00),
    ('WC-009', 'CUST-015', 'VINHASH-015', 'VA-GUR-020', '2026-06-10', 'EV-CBL-04', 'Charging Cable Assembly', 'Electrical', 'Charging speed concern investigated.', 15400.00),
    ('WC-010', 'CUST-016', 'VINHASH-016', 'SAM-MYS-023', '2026-06-15', 'BRK-PAD-12', 'Brake Pad Set', 'Brakes', 'Brake squeal inspection under goodwill.', 6800.00)
) AS wc(external_id, customer_external_id, vin_hash, dealer_code, claim_date, part_code, part_name, claim_category, description, amount)
JOIN customers c ON c.external_id = wc.customer_external_id
JOIN vehicles v ON v.vin_hash = wc.vin_hash
JOIN dealers d ON d.code = wc.dealer_code;

INSERT INTO feedback_records (
  source_type,
  source_reference_id,
  customer_id,
  vehicle_id,
  dealer_id,
  job_card_id,
  warranty_claim_id,
  feedback_date,
  raw_text,
  masked_text,
  rating,
  processing_status
)
SELECT
  f.source_type::"FeedbackSourceType",
  f.source_reference_id,
  c.id,
  v.id,
  d.id,
  jc.id,
  wc.id,
  f.feedback_date::timestamptz,
  f.raw_text,
  f.masked_text,
  f.rating,
  'Pending'::"ProcessingStatus"
FROM (
  VALUES
    ('Survey', 'FB-001', 'CUST-001', 'VINHASH-001', 'AT-BLR-001', 'JC-001', NULL, '2026-01-13', 'Brake noise was resolved and advisor explained the work clearly.', 'Brake noise was resolved and advisor explained the work clearly.', 5),
    ('Survey', 'FB-002', 'CUST-002', 'VINHASH-002', 'PA-MUM-002', 'JC-002', 'WC-001', '2026-01-19', 'EV service was good but I expected clearer battery warranty explanation.', 'EV service was good but I expected clearer battery warranty explanation.', 4),
    ('Survey', 'FB-003', 'CUST-003', 'VINHASH-003', 'CAH-DEL-003', 'JC-003', 'WC-002', '2026-02-05', 'AC issue took too long and I had to call repeatedly for updates.', 'AC issue took too long and I had to call repeatedly for updates.', 2),
    ('Survey', 'FB-004', 'CUST-004', 'VINHASH-004', 'SM-HYD-004', 'JC-004', NULL, '2026-02-12', 'Service quality was fine but billing wait time was high.', 'Service quality was fine but billing wait time was high.', 3),
    ('Survey', 'FB-005', 'CUST-005', 'VINHASH-005', 'EA-CHE-005', 'JC-005', 'WC-003', '2026-02-27', 'Hybrid warning lamp came back after delivery, please call urgently.', 'Hybrid warning lamp came back after delivery, please call urgently.', 1),
    ('JobCard', 'FB-006', 'CUST-006', 'VINHASH-006', 'MW-PUN-006', 'JC-006', NULL, '2026-03-04', 'Technician noted charging flap alignment issue and fixed it same day.', 'Technician noted charging flap alignment issue and fixed it same day.', 5),
    ('Survey', 'FB-007', 'CUST-007', 'VINHASH-007', 'RAG-JAI-011', 'JC-007', 'WC-004', '2026-03-18', 'Suspension noise is still present after repair estimate.', 'Suspension noise is still present after repair estimate.', 2),
    ('Survey', 'FB-008', 'CUST-008', 'VINHASH-008', 'ED-KOL-008', 'JC-008', NULL, '2026-03-29', 'Estimate explanation and washing quality were both good.', 'Estimate explanation and washing quality were both good.', 5),
    ('Survey', 'FB-009', 'CUST-009', 'VINHASH-009', 'CC-KOC-009', 'JC-009', 'WC-005', '2026-04-09', 'Infotainment screen replacement timeline was not communicated clearly.', 'Infotainment screen replacement timeline was not communicated clearly.', 2),
    ('Survey', 'FB-010', 'CUST-010', 'VINHASH-010', 'HM-AHM-010', 'JC-010', 'WC-006', '2026-04-20', 'EV range concern was explained well and calibration improved performance.', 'EV range concern was explained well and calibration improved performance.', 4),
    ('Survey', 'FB-011', 'CUST-011', 'VINHASH-011', 'UMM-NOI-012', 'JC-011', 'WC-007', '2026-05-04', 'This is a repeat steering vibration complaint and I need escalation.', 'This is a repeat steering vibration complaint and I need escalation.', 1),
    ('Survey', 'FB-012', 'CUST-012', 'VINHASH-012', 'GA-CMB-013', 'JC-012', NULL, '2026-05-15', 'Pickup and drop service was excellent and car was delivered early.', 'Pickup and drop service was excellent and car was delivered early.', 5),
    ('JobCard', 'FB-013', 'CUST-013', 'VINHASH-013', 'GAC-IND-014', 'JC-013', 'WC-008', '2026-05-22', 'Dashboard clips tightened; customer asked to monitor noise recurrence.', 'Dashboard clips tightened; customer asked to monitor noise recurrence.', 3),
    ('Survey', 'FB-014', 'CUST-014', 'VINHASH-014', 'SLM-NAG-015', 'JC-014', NULL, '2026-06-02', 'Consumables were added without explaining price breakup.', 'Consumables were added without explaining price breakup.', 2),
    ('Survey', 'FB-015', 'CUST-015', 'VINHASH-015', 'VA-GUR-020', 'JC-015', 'WC-009', '2026-06-11', 'Charging speed issue remains unresolved and I need a senior technician.', 'Charging speed issue remains unresolved and I need a senior technician.', 1),
    ('Survey', 'FB-016', 'CUST-016', 'VINHASH-016', 'SAM-MYS-023', 'JC-016', 'WC-010', '2026-06-16', 'Routine service was smooth and staff was polite.', 'Routine service was smooth and staff was polite.', 5)
) AS f(source_type, source_reference_id, customer_external_id, vin_hash, dealer_code, job_card_external_id, warranty_claim_external_id, feedback_date, raw_text, masked_text, rating)
JOIN customers c ON c.external_id = f.customer_external_id
JOIN vehicles v ON v.vin_hash = f.vin_hash
JOIN dealers d ON d.code = f.dealer_code
LEFT JOIN job_cards jc ON jc.external_id = f.job_card_external_id
LEFT JOIN warranty_claims wc ON wc.external_id = f.warranty_claim_external_id;

INSERT INTO dealer_scores (
  dealer_id,
  period_start,
  period_end,
  csi_score,
  nps_score,
  sentiment_score,
  retention_rate,
  open_escalations,
  feedback_count
)
SELECT
  d.id,
  '2026-06-01'::timestamptz,
  '2026-06-30'::timestamptz,
  900 - ((row_number() OVER (ORDER BY d.code) - 1) % 38),
  62 - ((row_number() OVER (ORDER BY d.code) - 1) % 18),
  (0.72 + (((row_number() OVER (ORDER BY d.code) - 1) % 14) * 0.01))::numeric(5, 4),
  (0.66 + (((row_number() OVER (ORDER BY d.code) - 1) % 11) * 0.01))::numeric(5, 4),
  ((row_number() OVER (ORDER BY d.code) - 1) % 5),
  18 + ((row_number() OVER (ORDER BY d.code) - 1) % 20)
FROM dealers d;

COMMIT;

