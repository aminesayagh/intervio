# Intervio

One repository with a Spring Boot backend and a React frontend. Design documents are in `docs/`.

## Requirements

- Java 17 or later
- Node.js 22 and pnpm
- Docker (local PostgreSQL and backend integration tests)

## Run locally

```bash
make install    # once: frontend libraries
make dev        # PostgreSQL, backend (http://localhost:8080) and frontend (http://localhost:5173)
```

Emails (confirmation, sign-in and reset links) are caught locally by Mailpit: open http://localhost:8025.

Ctrl+C stops the backend and the frontend; `make db-stop` stops PostgreSQL and Mailpit. Run `make` to list every command.

## Checks

```bash
make check      # frontend lint, types and formatting, then all backend and frontend tests
```
