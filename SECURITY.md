# Security Policy & Branch Protection Standards

## 1. Branch Protection Rules (GitHub Settings -> Rules -> Rulesets)

To enforce `NFR-01` and protect all environments, configure GitHub Branch Rulesets for **`dev`**, **`docker`**, and **`main`**:

| Branch | Environment | Allowed PR Sources | Required Settings |
| :--- | :--- | :--- | :--- |
| **`dev`** | Development Integration | `feat/*`, `fix/*`, `chore/*`, `docs/*`, `ci/*`, `test/*`, `refactor/*` | Restrict deletions & force pushes; require Pull Request; require status checks (`Enforce Branching Hierarchy`, `Backend (.NET 10 Build & Test)`, `Frontend (React + TypeScript Build)`, `Secret Scanning (Gitleaks)`, `Check Conventional Commit Title`). |
| **`docker`** | Staging (Containerized) | `dev`, `chore/docker*`, `hotfix/*` | All `dev` rules + require `Validate & Scan Docker Stack` status check to pass. |
| **`main`** | Production | `docker`, `hotfix/*` | All `docker` rules + require at least 1 approving review + block bypasses + require signed or linear history. |

## 2. Automated Security Controls
1. **Secret Scanning (`.github/workflows/security.yml`):** Gitleaks scans every push and PR so Entra ID secrets, JWT signing keys, and PostgreSQL credentials cannot be committed.
2. **Dependency Auditing:** Weekly Dependabot PRs targeting `dev` plus automated `dotnet list package --vulnerable` and `npm audit --audit-level=high` checks.
3. **Static Analysis (CodeQL SAST):** Automated C# and JavaScript/TypeScript vulnerability scanning on PRs and weekly schedules.
4. **Container Security (`.github/workflows/docker-staging.yml`):** Trivy scans Dockerfiles and build contexts before staging/production promotion.

## 3. Application Security Rules (`NFR-01`)
- Never commit `.env` files or real Entra ID / database secrets; use `.env.example` placeholders only.
- Development mock authentication (`DevMock`) must **never** be enabled outside `ASPNETCORE_ENVIRONMENT=Development`.
- Every mutating endpoint must verify both **Role** and **Home Campus (`CampusId`)** ownership.

## 4. Reporting a Vulnerability
Do **not** open a public GitHub issue for security vulnerabilities. Report suspected vulnerabilities privately to the repository maintainer via GitHub Security Advisories (**Security -> Advisories -> Report a vulnerability**).
