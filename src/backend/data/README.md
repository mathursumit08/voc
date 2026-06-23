# Backend Data Layer

This folder contains database-facing assets for the VoC backend.

```text
data/
  models/      Prisma schema and data model definitions
  migrations/  Migration files only; do not execute migrations unless explicitly requested
  scripts/     Standalone SQL scripts, stored procedures, and database utility scripts
```

## VOC-002 Schema Notes

- The core schema is defined in `models/schema.prisma`.
- Enum values use UpperCamelCase.
- Indexes are included for source lookup, processing status, timestamps, dealer/customer/vehicle filters, dashboard scoring, and action queues.
- Stored procedures should be added under `scripts/` when database-heavy dashboard, scoring, or bulk-processing logic is introduced.
- Prototype seed data is defined in `scripts/001_seed_prototype_data.sql` and can be reset explicitly with the backend `seed:prototype` script.

