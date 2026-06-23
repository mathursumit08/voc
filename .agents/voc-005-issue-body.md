Implementation order: VOC-005
Target GitHub Project: voc
Target Project Status: Backlog

**As the system,** I want uploaded and seeded source records normalized into a unified feedback model, **so that** all downstream processing uses the same structure.

**Acceptance Criteria**

- Feedback records include source type, customer, vehicle, dealer, feedback text, date, and source reference.
- Duplicate handling prevents the same source record from being loaded repeatedly.
- Records can be filtered by source type and processing status.
