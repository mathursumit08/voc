# VoC Project Agent Instructions

These instructions apply to the entire repository. Read and follow them before making any code, database, API, configuration, or infrastructure changes.

## Mandatory Engineering Rules

1. **Do not manually run database migrations unless explicitly requested.**
   - Never run migration commands as part of normal development, setup, test, or verification.
   - Creating or editing migration files is allowed when requested, but executing them requires explicit user instruction.
   - The backend application is configured to run pending SQL migrations during startup when `RUN_MIGRATIONS_ON_START=true`.

2. **Use stored procedures wherever practical for database-heavy operations.**
   - Prefer stored procedures for reporting, dashboard aggregations, bulk processing, scoring, and performance-sensitive workflows.
   - Keep SQL scripts in `src/backend/data/scripts`.

3. **Add appropriate indexes when creating or changing database schemas.**
   - Include indexes for foreign keys, lookup fields, filters, joins, status fields, timestamps, and dashboard query paths.
   - Document any intentionally omitted index when the reason is not obvious.

4. **Use UpperCamelCase for all enum values.**
   - Correct: `OpenEscalation`, `Critical`, `DealerUser`.
   - Incorrect: `OPEN_ESCALATION`, `open_escalation`, `openEscalation`.

5. **Add configuration keys to the correct environment file and its example file.**
   - Backend/runtime keys must be added to both `.env.backend` and `.env.backend.example`.
   - Frontend/browser keys must be added to both `.env.frontend` and `.env.frontend.example`.
   - Frontend keys must be safe for browser exposure and should use the `VITE_` prefix where the React app needs to read them.
   - Do not add secrets or real credentials to example files.

6. **Keep Swagger/OpenAPI documentation up to date.**
   - Every API addition, removal, request/response change, query parameter, status code, and auth requirement must be reflected in the Swagger/OpenAPI docs.
   - All APIs must be versioned under `/api/v1`.

7. **Add useful code comments.**
   - Add comments for non-obvious business rules, data transformations, scoring logic, stored procedure usage, integration assumptions, and security-sensitive behavior.
   - Avoid comments that merely repeat what the code says.

8. **Keep Docker configuration current.**
   - Update `Dockerfile` and `docker-compose.yml` whenever application startup, ports, services, dependencies, environment keys, or database requirements change.

9. **Use the required backend data folder structure.**
   - Database-related backend files must be organized as:

```text
src/backend/data/
  models/
  migrations/
  scripts/
```

   - Put all standalone SQL script files in `src/backend/data/scripts`.

10. **Version all APIs.**
    - Current API version: `v1`.
    - Route pattern: `/api/v1/...`.
    - Do not introduce unversioned `/api/...` routes.

## Before Making Changes

- Check whether the change touches database schemas, migrations, environment keys, API contracts, Swagger/OpenAPI docs, or Docker files.
- If it does, apply the relevant rules above in the same change.
- If a requested action conflicts with these rules, ask for clarification before proceeding.
