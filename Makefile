# Atlas Makefile — common dev commands.

.PHONY: help bootstrap dev test lint typecheck deploy clean

help:
	@echo "Atlas — make targets:"
	@echo "  bootstrap   First-time setup (Python venv, npm install, .env, git init)"
	@echo "  dev         Run dashboard (:3000) + coordinator (:8080) + emulators locally"
	@echo "  test        Run pytest + dashboard tests"
	@echo "  lint        ruff + eslint"
	@echo "  typecheck   mypy + tsc"
	@echo "  deploy      Terraform apply + Cloud Build trigger per agent"
	@echo "  clean       Remove venvs, build artifacts, emulator state"

bootstrap:
	@bash scripts/bootstrap.sh

dev:
	@echo "Starting Firestore emulator, dashboard, and coordinator in parallel..."
	@trap 'kill %1 %2 %3 2>/dev/null' EXIT; \
	 firebase emulators:start --only firestore --project demo & \
	 (cd apps/dashboard && npm run dev) & \
	 (source .venv/bin/activate && \
	   uvicorn agents.coordinator.agent:app --reload --port 8080) & \
	 wait

test:
	@source .venv/bin/activate && pytest agents/ -v
	@cd apps/dashboard && npm run lint

lint:
	@source .venv/bin/activate && ruff check agents/ mcp/
	@cd apps/dashboard && npm run lint

typecheck:
	@source .venv/bin/activate && mypy agents/
	@cd apps/dashboard && npm run typecheck

deploy:
	@cd infra/terraform && terraform apply
	@for svc in coordinator discovery strategy designer developer pm account; do \
		echo "Deploying $$svc..."; \
		gcloud builds submit . \
			--config=infra/cloudbuild.yaml \
			--substitutions=_SERVICE=$$svc,_DOCKERFILE=agents/$$svc/Dockerfile; \
	done
	@echo "Deploying dashboard..."
	@gcloud builds submit ./apps/dashboard \
		--config=infra/cloudbuild.yaml \
		--substitutions=_SERVICE=dashboard,_DOCKERFILE=apps/dashboard/Dockerfile

clean:
	rm -rf .venv apps/dashboard/node_modules apps/dashboard/.next
	rm -rf agents/**/__pycache__ agents/*.egg-info
	rm -rf .firebase
