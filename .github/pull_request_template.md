## Summary
<!-- Describe what this PR changes and which requirement(s) / milestone it implements (e.g., FR-04, NFR-01). -->

## Branching & Flow Check
- [ ] Source branch follows naming rules (`feat/*`, `fix/*`, `chore/*`, `docs/*`, `ci/*`, `dev`, or `docker`)
- [ ] Target branch follows the promotion hierarchy (`feat/*` -> `dev` -> `docker` [Staging] -> `main` [Production])
- [ ] PR title follows Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`, `security:`)

## Security & Quality Checklist
- [ ] No secrets, `.env` files, API keys, or credentials committed
- [ ] Role-based and campus-scoped authorization (`NFR-01`) verified for any new/modified endpoints
- [ ] Cross-campus endpoints expose only confirmed public event data (`FR-18`)
- [ ] Automated checks pass (`CI`, `Security`, and `Docker Staging` where applicable)

## Testing Notes
<!-- List commands run or manual test steps verified. -->
