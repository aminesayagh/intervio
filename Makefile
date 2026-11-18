# Intervio: run `make` to list the commands.

.DEFAULT_GOAL := help
.PHONY: help install db db-stop backend frontend dev test lint check

help: ## List the commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

install: ## Install frontend libraries (the backend downloads its own on first run)
	cd frontend && pnpm install

db: ## Start the local PostgreSQL (port 5433)
	docker compose up -d

db-stop: ## Stop the local PostgreSQL
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
