# CLC Operations & Departmental Platform

Centralized operations platform for the Campus Leadership Council (CLC) built with **ASP.NET Core (.NET 10)**, **React + TypeScript + Tailwind CSS**, **PostgreSQL 16**, **SignalR**, and **Docker**.

## Documentation
- [01-project_charter.md](./Documentation/01-project_charter.md) — Project scope, objectives, tech stack, and milestones.
- [02-srs.md](./Documentation/02-srs.md) — Functional (`FR-01`–`FR-19`) and non-functional (`NFR-01`–`NFR-06`) requirements.
- [03-sdd.md](./Documentation/03-sdd.md) — System architecture, ERD, RBAC matrix, REST API spec, SignalR, storage abstraction, wireframes, Docker topology, and Git governance.
- [SECURITY.md](./SECURITY.md) — Branch protection rulesets, security controls, and vulnerability reporting.

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
2. **Branch from `dev`** using typed kebab-case names (e.g., `feat/backend-auth-rbac`, `feat/proposals-workflow`, `chore/docker-compose`).
3. **Use Conventional Commits** for commit messages and PR titles (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `security:`).
4. **All automated checks must pass** before merging:
   - Branch-flow guard, `.NET 10` build/tests, and `React/TypeScript` build (`.github/workflows/ci.yml`)
   - Gitleaks secret scanning, dependency audit, and CodeQL SAST (`.github/workflows/security.yml`)
   - Docker Compose validation & Trivy scan on `docker` / `main` (`.github/workflows/docker-staging.yml`)
   - Conventional Commit PR title validation (`.github/workflows/commit-lint.yml`)
