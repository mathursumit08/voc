# Database Migrations

This folder contains generated migration artifacts for the VoC backend schema.

## Current Migration

- `001_initial_voc_schema.sql`: initial PostgreSQL schema generated from `src/backend/data/models/schema.prisma`.

## Guardrail

Do not manually run migration commands unless explicitly requested. Backend startup is configured to apply pending SQL migrations when `RUN_MIGRATIONS_ON_START=true`.
