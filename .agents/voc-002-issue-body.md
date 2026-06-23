Implementation order: VOC-002
Target GitHub Project: voc
Target Project Status: Backlog

**As a developer,** I want the core VoC database schema defined, **so that** prototype data can be stored consistently across customers, vehicles, dealers, feedback, NLP results, and action flows.

**Acceptance Criteria**

- Schema includes customers, vehicles, dealers, job cards, warranty claims, feedback records, NLP results, issue classifications, churn scores, dealer scores, warranty signals, CRM tasks, and human review queue.
- Seed-friendly relationships are defined between customer, vehicle, dealer, source records, and feedback records.
- Schema supports source type and processing status fields.
