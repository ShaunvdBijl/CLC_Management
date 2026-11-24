# Software Test Report: CLC Operations & Departmental Platform

**Version:** 1.0  
**Date Executed:** 24 November 2026  
**Branch Tested:** `test/qa-plan-and-suite` (branched from `dev` @ `580fdd9`)  
**Related Documents:**
- [02-srs.md](./02-srs.md)
- [03-sdd.md](./03-sdd.md)
- [04-test-plan.md](./04-test-plan.md)

---

## 1. Executive Summary

| Metric | Result |
| :--- | :--- |
| **Backend Integration Tests (`dotnet test -c Release`)** | **11 / 11 Passed** (`0` failed, `0` skipped, `9.83s` total build + test) |
| **Frontend Build (`tsc -b && vite build`)** | **Passed** (`0` TypeScript errors, `3.99s` bundle time) |
| **Frontend Dependency Audit (`npm audit`)** | **0 vulnerabilities** (`117` packages audited) |
| **Docker Compose Validation (`docker compose config --quiet`)** | **Passed** (exit code `0`) |
| **Release Readiness Decision** | **GO for Phase 6 Staging Promotion (`dev` → `docker`)** |

---

## 2. Detailed Test Case Results

| Test ID | Automated Test Method / Check | Requirement(s) | Status | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **TC-01** | `TC01_HealthAndAuthProfile_ReturnsOk` | `FR-01`, `NFR-04` | **PASS** | `/health` returned `200 OK`; `/api/v1/auth/me` resolved `Main Campus` / `CampusHead`. |
| **TC-02** | `TC02_CrossCampusProposalReview_IsBlockedWithForbidden` | `FR-02`, `FR-04`, `NFR-01` | **PASS** | North Campus Head reviewing Main Campus proposal blocked with `403 Forbidden`. |
| **TC-03** | `TC03_MemberRoleManagement_AllowsHomeCampusHead_BlocksCrossCampusAndNonHead` | `FR-02`, `FR-03`, `NFR-01` | **PASS** | Deputy & cross-campus edits blocked (`403`); home Campus Head reassignment succeeded (`200`). |
| **TC-04** | `TC04_ProposalStateMachine_RequiresCommentOnChangesRequested_AndAutoCreatesClubOnApproval` | `FR-05`, `FR-07` | **PASS** | Empty comment rejected (`400`); `ChangesRequested` → `Pending` → `Approved` auto-created `AI & Robotics Club`. |
| **TC-05** | `TC05_MarketingProposalAndPosterUpload_ValidatesMagicBytesAndRole` | `FR-06`, `FR-09`, `NFR-01` | **PASS** | Marketing proposal created (`201`); non-Marketing upload blocked (`403`); spoofed PNG rejected (`400`); valid PNG stored (`200`). |
| **TC-06** | `TC06_EventConflictCheck_DetectsVenueAndTimeOverlap` | `FR-08`, `FR-16` | **PASS** | Overlapping time + venue flagged `hasConflict = true` (`VenueAndTimeOverlap`). |
| **TC-07** | `TC07_CampusMeeting_TriggersInAppNotificationForCampusMembers` | `FR-10`, `FR-14` | **PASS** | Scheduling campus meeting persisted `MeetingScheduled` notification for home campus members. |
| **TC-08** | `TC08_TaskAssignmentAndCompletion_NotifiesMemberAndLogsToQuarterlyHistory` | `FR-11`–`FR-15`, `FR-19` | **PASS** | Task creation triggered `TaskAssigned` notification; moving to `Done` recorded `TaskCompleted` in `/api/v1/history`. |
| **TC-09** | `TC09_CampusCalendar_AggregatesHomeEventsAndMeetings` | `FR-17` | **PASS** | `/api/v1/calendar/campus` returned Main Campus events & meetings and excluded North Campus. |
| **TC-10** | `TC10_CrossCampusEvents_ReturnsBothCampusesPublicEventsOnly` | `FR-17`, `FR-18` | **PASS** | `/api/v1/cross-campus/events` returned confirmed events from both campuses via `PublicCampusEventDto`. |
| **TC-11** | `TC11_StandardQueries_RespondWithin500msTarget` + `npm run build` | `FR-15`, `FR-16`, `NFR-06` | **PASS** | Average query latency verified well under `< 500 ms`; React/TS production bundle built cleanly (`dist/assets/index-*.js`). |
| **TC-12** | `docker compose config --quiet` | `NFR-02` | **PASS** | Multi-service Compose blueprint (`postgres`, `api`, `frontend`, named volumes) validated cleanly. |

---

## 3. Observations & Follow-Up Items
- **NuGet Transitive Advisory Warnings (`NU1902` / `NU1903`):** `dotnet restore` reported transitive vulnerability warnings in `Microsoft.OpenApi 2.0.0` (via `Microsoft.AspNetCore.OpenApi 10.0.0`) and `System.Security.Cryptography.Pkcs 9.0.0` (via `Microsoft.Identity.Web 3.8.2`). These are non-blocking for build/tests and are actively monitored by `.github/dependabot.yml` and `.github/workflows/security.yml` for patched NuGet releases.
- **Staging Verification Pending (`Phase 6`):** Live containerized startup (`docker compose up --build`), Trivy container image scan, and real Microsoft Entra ID App Registration token exchange will be executed upon promoting `dev` → `docker` (Staging).

---

## 4. Sign-Off
All Phase 5 exit criteria defined in [04-test-plan.md](./04-test-plan.md) are met. The codebase is approved for merging into `dev` and promoting **`dev` → `docker` (Staging)** for Phase 6 deployment verification.
