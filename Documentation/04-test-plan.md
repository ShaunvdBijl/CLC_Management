# Software Test Plan: CLC Operations & Departmental Platform

**Version:** 1.0  
**Date:** 24 November 2026  
**Phase:** Phase 5 — Testing & Quality Assurance (QA)  
**Related Documents:**
- [01-project_charter.md](./01-project_charter.md)
- [02-srs.md](./02-srs.md)
- [03-sdd.md](./03-sdd.md)

---

## 1. Objectives & Scope

This test plan verifies that the **CLC Operations & Departmental Platform (v1.0)** meets all functional requirements (`FR-01`–`FR-19`), non-functional targets (`NFR-01`–`NFR-06`), security/campus isolation boundaries, and containerization standards prior to promoting `dev` → `docker` (Staging) → `main` (Production).

### Test Levels
1. **Automated API Integration Tests (`xUnit` + `WebApplicationFactory`):** End-to-end HTTP verification of authentication/RBAC, campus scoping, proposal state machine, conflict detection, poster file validation, notifications, calendars, and activity history.
2. **Frontend Static & Build Verification (`tsc -b && vite build`):** Strict TypeScript type-checking and Vite production bundle verification.
3. **Security & CI Gates (GitHub Actions):** Gitleaks secret scanning, NuGet/npm vulnerability audit, CodeQL SAST, branch-flow guard, and Conventional Commit lint.
4. **Container & Staging Smoke Testing (`docker` branch):** `docker compose config --quiet`, `docker compose build`, Trivy container/filesystem scan, and live end-to-end UI walkthrough.

---

## 2. Requirements Traceability Matrix

| Req ID | Requirement Summary | Test Case ID(s) | Verification Method |
| :--- | :--- | :--- | :--- |
| **FR-01** | Microsoft Entra ID OAuth 2.0 auth (+ DevMock in Development) | `TC-01` | Automated Integration + Staging Manual |
| **FR-02** | Role-based & campus-based access control across all endpoints | `TC-02`, `TC-03` | Automated Integration |
| **FR-03** | Campus Head promotes/demotes/reassigns campus members | `TC-03` | Automated Integration |
| **FR-04** | Events dept submits event proposal | `TC-02` | Automated Integration |
| **FR-05** | Clubs dept submits club proposal & designates Club Head | `TC-04` | Automated Integration |
| **FR-06** | Marketing dept submits marketing proposal linked to event/club | `TC-05` | Automated Integration |
| **FR-07** | Leadership reviews proposals with mandatory comment on Changes/Reject | `TC-04` | Automated Integration |
| **FR-08** | Events dept publishes confirmed events on campus calendar | `TC-06`, `TC-09` | Automated Integration |
| **FR-09** | Marketing dept uploads promotional posters (PNG/JPG/WebP, ≤ 5 MB) | `TC-05` | Automated Integration |
| **FR-10** | Leadership schedules campus meetings on campus calendar | `TC-07`, `TC-09` | Automated Integration |
| **FR-11–13** | Dept Heads create & assign operational tasks to dept members | `TC-08` | Automated Integration |
| **FR-14** | In-app notifications on task assignment, meetings, & proposal reviews | `TC-07`, `TC-08` | Automated Integration |
| **FR-15** | Events Kanban board (`To Do`, `In Progress`, `Done`) by priority | `TC-08`, `TC-11` | Automated Integration + Frontend Build |
| **FR-16** | Events Gantt chart & date/venue conflict detection | `TC-06`, `TC-11` | Automated Integration + Frontend Build |
| **FR-17** | Local campus calendar & university-wide calendar | `TC-09`, `TC-10` | Automated Integration |
| **FR-18** | Cross-campus activity board hides internal tasks & unapproved proposals | `TC-10` | Automated Integration |
| **FR-19** | Filterable departmental activity history for quarterly evaluations | `TC-08` | Automated Integration |
| **NFR-01** | Zero unauthorized cross-role or cross-campus mutations | `TC-02`, `TC-03`, `TC-05` | Automated Integration + Security CI |
| **NFR-02** | Reproducible Docker containers & Compose config | `TC-12` | Docker Compose Validation + Staging CI |
| **NFR-03–05** | Persistence, availability, & 50 concurrent active users | `TC-01`, `TC-12` | Architecture Review + Staging Smoke Test |
| **NFR-06** | Standard API queries return in `< 500 ms` | `TC-11` | Automated Latency Assertion |

---

## 3. Detailed Test Cases

| ID | Test Case | Preconditions | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | Health & Auth Profile Resolution | Seeded DB | `GET /health` returns `200 OK`; `GET /api/v1/auth/me` returns authenticated user's campus, role, and department. |
| **TC-02** | Cross-Campus Proposal Review Blocked | Main Campus proposal exists | North Campus Head receives `403 Forbidden` attempting to review Main Campus proposal. |
| **TC-03** | Member Role Promotion & Cross-Campus Guard | Main Campus Head + Main Events Member + North Head | Main Campus Head can promote/transfer Main Campus member (`200 OK`); attempting to edit North Campus user returns `403 Forbidden`; non-CampusHead receives `403 Forbidden`. |
| **TC-04** | Proposal State Machine & Club Auto-Creation | Clubs Head + Campus Head | Reviewing `ChangesRequested` with empty comment returns `400 Bad Request`; valid feedback sets `ChangesRequested`; resubmit returns to `Pending`; `Approved` auto-creates `Club` record. |
| **TC-05** | Marketing Proposal & Poster Upload Validation | Marketing Head + Events Head + Main Event | Marketing Head submits event-linked proposal (`201 Created`) and uploads valid PNG (`200 OK`); spoofed/non-image file returns `400 Bad Request`; Events Head uploading poster returns `403 Forbidden`. |
| **TC-06** | Event Venue & Date Conflict Detection | Seeded Main Campus event | `GET /api/v1/events/conflicts` overlapping time + same venue returns `hasConflict = true` with `VenueAndTimeOverlap`. |
| **TC-07** | Campus Meeting & In-App Notification Delivery | Main Campus Head + Main Events Member | Creating a meeting (`201 Created`) persists `MeetingScheduled` notifications for campus members visible in `GET /api/v1/notifications`. |
| **TC-08** | Task Assignment, Completion & Quarterly History | Main Events Head + Main Events Member | Assigning task triggers `TaskAssigned` notification; member marks task `Done` (`200 OK`); `TaskCompleted` appears in `GET /api/v1/history?department=Events`. |
| **TC-09** | Campus Calendar Aggregation | Confirmed event + scheduled meeting | `GET /api/v1/calendar/campus` returns both `Event` and `Meeting` items for the caller's home campus only. |
| **TC-10** | Cross-Campus Public Event Privacy Boundary | Events in Main & North Campus | `GET /api/v1/cross-campus/events` returns confirmed events from both campuses projected strictly as `PublicCampusEventDto`. |
| **TC-11** | API Performance (< 500 ms) & Frontend Build | Warm API + React SPA | Standard calendar/proposal/task queries respond in `< 500 ms`; `npm run build` passes with 0 TypeScript errors. |
| **TC-12** | Docker Compose & Container Validation | `docker-compose.yml` + Dockerfiles | `docker compose config --quiet` succeeds with exit code `0`; staging CI builds both images and runs Trivy scan. |

---

## 4. Exit Criteria (Go / No-Go for Phase 6 Staging Promotion)
- 100% of automated backend integration tests pass (`0` failures).
- Frontend `tsc -b && vite build` passes with `0` errors and `0` high/critical npm vulnerabilities.
- All GitHub Actions workflows (`CI`, `Security`, `Commit Lint`) pass on the PR into `dev`.
- Test execution results are documented in [05-test-report.md](./05-test-report.md).
