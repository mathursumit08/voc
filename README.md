# VoC Prototype

Voice of Customer prototype module for automobile aftersales feedback intelligence.

## Project Structure

```text
src/
  backend/
    src/
      config/
      routes/v1/
      swagger/
    data/
      models/
      migrations/
      scripts/
  frontend/
    src/
      components/
      styles/
  shared/
    types/
```

## Foundation

- Frontend: React + TypeScript + Vite + Tailwind CSS.
- Backend: Node.js + Express + TypeScript.
- Database configuration: PostgreSQL + Prisma schema under `src/backend/data/models/schema.prisma`.
- API versioning: all routes use `/api/v1`.
- Swagger/OpenAPI: available from the backend at `/api-docs` and `/openapi.json`.
- Docker: `Dockerfile` and `docker-compose.yml` are included for frontend, backend, and PostgreSQL setup.
- Backend startup applies pending SQL migrations from `src/backend/data/migrations` when `RUN_MIGRATIONS_ON_START=true`.

## Environment Files

```text
.env.backend          Backend runtime, PostgreSQL, and Swagger configuration
.env.backend.example  Backend example configuration
.env.frontend         Frontend Vite/browser-safe configuration
.env.frontend.example Frontend example configuration
```

Frontend values are bundled into the browser, so only browser-safe `VITE_` keys should be added to `.env.frontend`.

## Docker Services

```text
postgres  -> localhost:5432
backend   -> http://localhost:4000
frontend  -> http://localhost:5173
```

## First Endpoint

```text
GET /api/v1/health
```

## Important Development Rule

Do not manually run database migration commands unless explicitly requested. Backend startup is configured to apply pending SQL migrations when `RUN_MIGRATIONS_ON_START=true`. See `AGENTS.md` for all project engineering guardrails.
