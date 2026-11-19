# Intervio: run `make` to list the commands.

.DEFAULT_GOAL := help

# Local secrets (Google sign-in keys), never committed: loaded from .env when present.
-include .env
export $(shell sed -n 's/^\([A-Z_][A-Z0-9_]*\)=.*/\1/p' .env 2>/dev/null)

.PHONY: help install db db-stop backend frontend dev test lint check

help: ## List the commands
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

install: ## Install frontend libraries (the backend downloads its own on first run)
	cd frontend && pnpm install

db: ## Start PostgreSQL (port 5433) and the email catcher (http://localhost:8025)
	docker compose up -d

db-stop: ## Stop PostgreSQL and the email catcher
	docker compose down

backend: db ## Run the backend on http://localhost:8080
	cd backend && ./mvnw spring-boot:run

frontend: ## Run the frontend on http://localhost:5173
	cd frontend && pnpm dev

dev: db ## Run the backend and the frontend together (Ctrl+C stops both)
	$(MAKE) -j2 backend frontend

test: ## Run all backend and frontend tests
	cd backend && ./mvnw verify
	cd frontend && pnpm test

lint: ## Check frontend code style and types
	cd frontend && pnpm lint && pnpm typecheck && pnpm format:check

check: lint test ## Run every check before pushing
