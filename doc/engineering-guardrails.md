# VoC Engineering Guardrails

This document captures the project rules that must be followed during VoC prototype development. The same rules are also stored in the root `AGENTS.md` file so coding agents can refer to them before making changes.

## Rules

1. Never manually run database migrations unless specifically requested. The backend app may run pending SQL migrations on startup when `RUN_MIGRATIONS_ON_START=true`.
2. Use stored procedures wherever practical for performance-sensitive database operations.
3. Add appropriate indexes when creating or changing database schemas.
4. Use UpperCamelCase for all enum values.
5. Add every new backend configuration key to `.env.backend` and `.env.backend.example`; add every new frontend configuration key to `.env.frontend` and `.env.frontend.example`.
6. Keep Swagger/OpenAPI documentation up to date at all times.
7. Add useful code comments for non-obvious logic and business rules.
8. Keep `Dockerfile` and `docker-compose.yml` up to date.
9. Store backend database files under:

```text
src/backend/data/
  models/
  migrations/
  scripts/
```

All standalone SQL scripts must go in `src/backend/data/scripts`.

10. Version all APIs under `/api/v1`.
11. Paginate frontend pages or panels that display record lists by default. Only omit pagination when explicitly requested or when the list is a fixed, tiny static summary.

## Recommended Enforcement Points

- `AGENTS.md`: Primary instruction file for coding agents.
- Pull request checklist: Confirm migrations, indexes, Swagger, Docker, env keys, and API versioning.
- Code review: Verify stored procedures, enum casing, comments, and database folder structure.
- CI checks, once available: Validate OpenAPI docs, Docker build, and route versioning.
