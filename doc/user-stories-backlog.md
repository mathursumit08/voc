# VoC Prototype User Stories Backlog

This backlog is ordered for implementation. The `VOC-###` identifier should be used in GitHub issue titles so the intended build sequence remains visible inside the Backlog view.

## Implementation Order

### VOC-001 - Set up project foundation

**As a developer,** I want the VoC prototype project scaffolded with frontend, backend, shared code, environment configuration, and database connectivity, **so that** the team can build features on a consistent base.

**Acceptance Criteria**

- React + TypeScript frontend is available under `src/frontend`.
- Node.js + Express backend is available under `src/backend`.
- Shared types/constants can be placed under `src/shared`.
- PostgreSQL and Prisma configuration are available.
- Health endpoint is available at `GET /api/v1/health`.

### VOC-002 - Define core database schema

**As a developer,** I want the core VoC database schema defined, **so that** prototype data can be stored consistently across customers, vehicles, dealers, feedback, NLP results, and action flows.

**Acceptance Criteria**

- Schema includes customers, vehicles, dealers, job cards, warranty claims, feedback records, NLP results, issue classifications, churn scores, dealer scores, warranty signals, CRM tasks, and human review queue.
- Seed-friendly relationships are defined between customer, vehicle, dealer, source records, and feedback records.
- Schema supports source type and processing status fields.

### VOC-003 - Seed prototype master data

**As a demo administrator,** I want sample customers, vehicles, dealers, job cards, and warranty claims seeded, **so that** the prototype can be demonstrated without live integrations.

**Acceptance Criteria**

- Seed data includes multiple dealers and vehicle models.
- Seed data includes realistic service visit and warranty examples.
- Seed data can be reset for repeatable demos.

### VOC-004 - Upload feedback data

**As an admin user,** I want to upload CSV or Excel feedback files, **so that** survey, job-card, warranty, and review samples can be loaded into the prototype.

**Acceptance Criteria**

- User can upload a supported file from the UI.
- Backend validates required columns and returns friendly errors.
- Valid rows are normalized into feedback records.
- Upload summary shows total, accepted, rejected, and duplicate rows.

### VOC-005 - Normalize feedback records

**As the system,** I want uploaded and seeded source records normalized into a unified feedback model, **so that** all downstream processing uses the same structure.

**Acceptance Criteria**

- Feedback records include source type, customer, vehicle, dealer, feedback text, date, and source reference.
- Duplicate handling prevents the same source record from being loaded repeatedly.
- Records can be filtered by source type and processing status.

### VOC-006 - Mask PII before analysis

**As a compliance-conscious user,** I want personally identifiable information masked before NLP processing, **so that** analysis outputs avoid exposing sensitive customer data.

**Acceptance Criteria**

- Common PII patterns such as phone numbers and email addresses are masked.
- Original raw text remains separated from processed text.
- Processed text is used by the NLP pipeline.

### VOC-007 - Run language detection and translation

**As an OEM analyst,** I want feedback language detected and translated where needed, **so that** multilingual feedback can be reviewed consistently.

**Acceptance Criteria**

- Language is detected for each feedback record.
- Non-English feedback stores translated English text.
- Original language and translated text are visible in feedback details.

### VOC-008 - Analyze sentiment and topics

**As an OEM analyst,** I want sentiment and topics extracted from feedback, **so that** I can understand customer pain points at scale.

**Acceptance Criteria**

- Feedback receives sentiment classification.
- Feedback receives one or more topic tags.
- Confidence or processing source is stored for traceability.

### VOC-009 - Classify automotive issues

**As a service quality manager,** I want feedback classified into automotive issue categories, **so that** service, product, warranty, and dealer issues can be analyzed separately.

**Acceptance Criteria**

- Feedback is mapped to an automotive issue category.
- Classification supports confidence score and explanation.
- Low-confidence records can be routed to review.

### VOC-010 - Calculate urgency score

**As a dealer operations user,** I want urgent complaints identified, **so that** critical customer issues can be prioritized for recovery.

**Acceptance Criteria**

- Urgency score is calculated from sentiment, issue type, repeat patterns, and complaint severity.
- Critical feedback is flagged clearly.
- Urgency can be filtered in dashboards and feedback explorer.

### VOC-011 - Build feedback explorer

**As an OEM or dealer user,** I want to search and filter all feedback, **so that** I can investigate individual customer comments and patterns.

**Acceptance Criteria**

- Feedback list supports filters for dealer, model, date, source, sentiment, issue, and urgency.
- User can open a feedback detail view.
- Feedback detail shows raw text, masked text, translated text, sentiment, topics, issue classification, and related actions.

### VOC-012 - Build OEM executive dashboard

**As an OEM executive user,** I want a high-level VoC dashboard, **so that** I can monitor customer sentiment, major issues, dealer performance, and risk signals.

**Acceptance Criteria**

- Dashboard shows overall sentiment distribution.
- Dashboard shows top issue categories.
- Dashboard shows dealer comparison summary.
- Dashboard shows critical feedback and warranty signal counts.

### VOC-013 - Build dealer performance dashboard

**As a dealer manager,** I want a dealer-specific dashboard, **so that** I can understand my dealership's feedback, issues, and recovery tasks.

**Acceptance Criteria**

- Dealer users see only assigned dealer data.
- Dashboard shows sentiment trend, top issues, complaint volume, and open CRM tasks.
- Dealer scorecard compares current performance against benchmark metrics.

### VOC-014 - Detect repeat complaints

**As a service recovery user,** I want repeat complaints detected within a configurable lookback period, **so that** recurring customer issues can be escalated sooner.

**Acceptance Criteria**

- System identifies repeat complaints for the same customer or vehicle.
- Default lookback period is configurable.
- Repeat complaint flag contributes to urgency and churn risk.

### VOC-015 - Generate churn risk score

**As an OEM retention user,** I want customers assigned churn risk scores, **so that** high-risk customers can be prioritized for intervention.

**Acceptance Criteria**

- Churn risk uses sentiment, repeat complaints, urgency, issue category, and service history signals.
- Score includes a reason summary.
- High-risk customers are visible in dashboards and feedback explorer.

### VOC-016 - Create mock CRM recovery tasks

**As a dealer user,** I want critical feedback converted into mock CRM recovery tasks, **so that** the prototype shows how service recovery would be managed.

**Acceptance Criteria**

- Critical feedback can create a CRM task.
- Task includes customer, dealer, issue, priority, status, and due date.
- Task can be closed with resolution notes.

### VOC-017 - Generate dealer response drafts

**As a dealer user,** I want AI-assisted response drafts for customer feedback, **so that** dealers can respond faster while preserving human review.

**Acceptance Criteria**

- User can generate a draft response from feedback detail.
- Draft references the issue and tone of the feedback.
- User can edit or discard the draft before use.

### VOC-018 - Detect warranty and quality signals

**As a warranty quality user,** I want recurring warranty-related issues identified, **so that** potential quality signals can be escalated.

**Acceptance Criteria**

- System groups warranty-related feedback by model, part, issue, and dealer.
- Potential signals are scored or flagged.
- Warranty signal dashboard lists active signals and supporting feedback.

### VOC-019 - Build human review queue

**As a reviewer,** I want low-confidence or high-impact records routed to a review queue, **so that** humans can correct classifications and improve demo credibility.

**Acceptance Criteria**

- Queue includes low-confidence NLP classifications and critical feedback.
- Reviewer can update sentiment, topic, issue category, and urgency.
- Review resolution is stored for traceability.

### VOC-020 - Add role-based access control

**As an admin user,** I want access controlled by user role, **so that** OEM, dealer, admin, and reviewer users see only the right screens and data.

**Acceptance Criteria**

- Prototype roles include admin, OEM user, dealer user, and reviewer.
- Routes and API responses respect role permissions.
- Dealer users are restricted to assigned dealer data.

### VOC-021 - Add prototype demo polish and sample scenarios

**As a stakeholder,** I want curated demo scenarios and polished UI states, **so that** the prototype can be presented clearly for validation.

**Acceptance Criteria**

- Demo data includes at least three clear customer journeys.
- Empty, loading, and error states are present for core screens.
- Prototype can be reset to a known demo state.
- Key screens are ready for stakeholder walkthrough.

