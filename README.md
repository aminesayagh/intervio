# Intervio

One repository with a Spring Boot backend and a React frontend. Design documents are in `docs/`.

## Requirements

- Java 17 or later
- Node.js 22 and pnpm
- Docker (local PostgreSQL and backend integration tests)

## Run locally

```bash
docker compose up -d            # PostgreSQL on localhost:5433

cd backend
./mvnw spring-boot:run          # API on http://localhost:8080

cd frontend
pnpm install
pnpm dev                        # App on http://localhost:5173, /api is proxied to the backend
```

## Checks

```bash
cd backend && ./mvnw verify     # unit tests, then *IT integration tests (Testcontainers)

cd frontend
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
```
