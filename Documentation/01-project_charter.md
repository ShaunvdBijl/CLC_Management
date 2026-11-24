# Project Charter: CLC Operations & Departmental Platform

**Target Completion:** 5 December 2026 *(Soft Target)*  
**Tech Stack:** .NET (ASP.NET Core), React, PostgreSQL, Docker  

---

## 1. Problem Statement
Managing Campus Leadership Council (CLC) operations is currently fragmented across Microsoft Teams, general WhatsApp chats, and isolated departmental WhatsApp groups. Because information is scattered:
* Departments struggle to coordinate daily duties, event planning, and promotional tasks in one unified workspace.
* Tracking completed departmental work for quarterly evaluations requires manually scrolling back through months of chat history.
* Campuses operate in isolation with no shared visibility into upcoming events at other campuses, limiting cross-campus inspiration and awareness.

---

## 2. Project Objectives
1. **Streamline Departmental Workflows:** Provide dedicated tools for the Events, Clubs, and Marketing departments to manage proposals, posters, clubs, and member task assignments in one place.
2. **Standardize Proposal Approvals:** Replace informal chat approvals with a structured review pipeline (`Pending` → `Approved` / `Changes Requested` / `Rejected` with reason) managed by the Campus Head and Deputy.
3. **Centralize Scheduling & Conflict Detection:** Combine campus-specific calendars, Gantt timelines, and Kanban boards so Events and leadership can prevent scheduling clashes.
4. **Enable Cross-Campus Event Visibility:** Allow all campuses to view a university-wide calendar and activity feed showcasing confirmed event titles and details from other campuses.
5. **Maintain an Automatic Activity Trail:** Automatically log completed departmental tasks and approved events so quarterly evaluations can be reviewed without searching external chats.

---

## 3. Scope

### In Scope (v1.0)
* **Microsoft Authentication & Role-Based Access:** Login via Microsoft Entra ID mapped to fixed CLC positions (Campus Head, Deputy, Events Head, Clubs Head, Marketing Head, and Departmental Members).
* **Departmental Operations:**
  * **Events:** Submit event proposals, publish confirmed events to the calendar, prioritize tasks on a Kanban board, and check date conflicts on a Gantt chart.
  * **Clubs:** Register new clubs and assign Club Heads.
  * **Marketing:** Submit marketing proposals linked to events/clubs and upload promotional posters to events.
  * **Leadership (Campus Head / Deputy):** Schedule campus meetings, review/approve proposals with feedback, and manage member role promotions, demotions, or transfers.
* **In-App Notifications:** Real-time/in-app notification feed alerting users when tasks are assigned or proposal statuses change.
* **Campus & University-Wide Calendars:** Local campus calendar plus a university-wide calendar and cross-campus activity board displaying event titles and details across all campuses.
* **Departmental History View:** Filterable log of completed department activities and approved events to support quarterly evaluations.

### Out of Scope (v1.0)
* **Custom Role Creation:** Users cannot create or edit system roles; role definitions are managed strictly by developers.
* **External Email / SMS / WhatsApp Integrations:** All notifications are strictly in-app; no external email servers or messaging APIs will be integrated.
* **Live Chat / Instant Messaging:** The platform does not replace Teams or WhatsApp for real-time text messaging.
* **Cross-Campus Internal Task Exposure:** Internal departmental tasks, member assignments, and unapproved proposals remain private to their home campus.
* **Native Mobile Apps:** Dedicated iOS/Android binaries are excluded; the React frontend will be mobile-responsive.

---

## 4. Tech Stack Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Database** | **PostgreSQL** | Relational engine suited for structured role hierarchies, proposals, and relational event/task data; handles 50+ concurrent users effortlessly. |
| **Backend API** | **.NET (ASP.NET Core)** | High-performance C# Web API with strong typing, built-in role-based authorization policies, and clean Microsoft Entra ID integration. |
| **Frontend** | **React** | Component-driven UI ideal for interactive calendars, Kanban boards, Gantt timelines, and role-specific dashboards. |
| **Deployment** | **Docker** | Ensures consistent local development and streamlined CI/CD container deployment. |

---

## 5. Target Timeline (Soft Milestones)

| Phase | Target Date | Deliverable |
| :--- | :--- | :--- |
| **Phase 1–2:** Charter & SRS | 25 Nov 2026 | `01-project-charter.md` & `02-srs.md` merged |
| **Phase 3:** System Design | 27 Nov 2026 | `03-sdd.md` (ERD, API endpoints, wireframes) merged |
| **Phase 4:** Core Implementation | 02 Dec 2026 | Auth, RBAC, Proposals, Departmental CRUD, Calendars & Boards |
| **Phase 5–6:** Testing & Deployment | 05 Dec 2026 | `04-test-plan.md`, `05-test-report.md`, Dockerized live deployment |