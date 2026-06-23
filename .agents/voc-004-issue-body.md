Implementation order: VOC-004
Target GitHub Project: voc
Target Project Status: Backlog

**As an admin user,** I want to upload CSV or Excel feedback files, **so that** survey, job-card, warranty, and review samples can be loaded into the prototype.

**Acceptance Criteria**

- User can upload a supported file from the UI.
- Backend validates required columns and returns friendly errors.
- Valid rows are normalized into feedback records.
- Upload summary shows total, accepted, rejected, and duplicate rows.
