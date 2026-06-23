Implementation order: VOC-001
Target GitHub Project: voc
Target Project Status: Backlog

**As a developer,** I want the VoC prototype project scaffolded with frontend, backend, shared code, environment configuration, and database connectivity, **so that** the team can build features on a consistent base.

**Acceptance Criteria**

- React + TypeScript frontend is available under `src/frontend`.
- Node.js + Express backend is available under `src/backend`.
- Shared types/constants can be placed under `src/shared`.
- PostgreSQL and Prisma configuration are available.
- Health endpoint is available at `GET /api/v1/health`.
