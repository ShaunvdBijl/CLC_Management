# CLC Operations & Departmental Platform

Centralized operations platform for the Campus Leadership Council (CLC) built with **ASP.NET Core (.NET 10)**, **React + TypeScript + Tailwind CSS**, **PostgreSQL 16**, **SignalR**, and **Docker**.

## Documentation
- [01-project_charter.md](./Documentation/01-project_charter.md) — Project scope, objectives, tech stack, and milestones.
- [02-srs.md](./Documentation/02-srs.md) — Functional (`FR-01`–`FR-19`) and non-functional (`NFR-01`–`NFR-06`) requirements.
- [03-sdd.md](./Documentation/03-sdd.md) — System architecture, ERD, RBAC matrix, REST API spec, SignalR, storage abstraction, wireframes, Docker topology, and Git governance.
- [SECURITY.md](./SECURITY.md) — Branch protection rulesets, security controls, and vulnerability reporting.

---

## Quick Start (Docker Compose)

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Build and start PostgreSQL, the .NET 10 API, and the React Nginx frontend:
   ```bash
   docker compose up --build
   ```
3. Access the platform:
   - **Frontend SPA:** `http://localhost:3000`
   - **API Health Check:** `http://localhost:5080/health`

> **Development Role Switcher:** When `AUTH_MODE=DevMock` and `ASPNETCORE_ENVIRONMENT=Development`, use the dropdown in the top header to switch between seeded users across **Main Campus** and **North Campus** across all 6 CLC roles. Set `AUTH_MODE=EntraId` and configure `AZURE_AD_*` / `VITE_ENTRA_*` for Microsoft Entra ID in production.

---

## Local Development (Without Docker)

### Backend (.NET 10)
```bash
cd backend
dotnet restore
dotnet test
dotnet run --project ClcManagement.Api --urls http://localhost:5080
```

### Frontend (React + Vite)
```bash
cd frontend
npm ci
npm run dev
```
Open `http://localhost:5173`.

---

## Git Branching & Workflow Rules

This repository follows a strict 4-tier promotion flow enforced by GitHub Actions:

```text
main (Production)
  ▲  PR from docker (or hotfix/*)
docker (Staging — Containerized Docker Compose verification)
  ▲  PR from dev
dev (Development integration — Protected)
  ▲  PR from feat/*, fix/*, chore/*, docs/*, ci/*, test/*
feature branches (branched off dev)
```

### Contribution Rules
1. **Never push directly** to `main`, `docker`, or `dev`.
2. **Branch from `dev`** using typed kebab-case names (e.g., `feat/backend-core-api`, `feat/frontend-spa`, `chore/docker-staging-setup`).
3. **Use Conventional Commits** for commit messages and PR titles (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `security:`).
4. **All automated checks must pass** before merging (`CI`, `Security`, `Docker Staging`, and `Commit Lint`).
