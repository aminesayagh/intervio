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

Google sign-in needs a `.env` file at the root (never committed), loaded by `make`:

```
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=...
```

In Google Cloud, the OAuth client allows the origin `http://localhost:5173` and the redirect URI `http://localhost:5173/login/oauth2/code/google`. Without `.env`, everything else works and the Google button is inactive.

Uploaded files are kept in `storage/` at the root (git-ignored) and scanned by ClamAV, which `make db` starts with the database. ClamAV needs about 1–1.5 GB of memory and downloads its virus signatures on first start (a few minutes); until it is ready, uploads are refused.

Emails (confirmation, sign-in and reset links) are caught locally by Mailpit: open http://localhost:8025.

Ctrl+C stops the backend and the frontend; `make db-stop` stops PostgreSQL and Mailpit. Run `make` to list every command.

## Checks

```bash
make check      # frontend lint, types and formatting, then all backend and frontend tests
```
