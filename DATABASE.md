# DATABASE

Schema source of truth: [`src/lib/db/schema.ts`](src/lib/db/schema.ts). Generated SQL: `drizzle/migrations/`.

## Core tables

| Table | Purpose |
|---|---|
| `users` | Internal employees + contractors. Fields: email, password_hash, full_name, phone, position, department_id, reports_to_user_id, status (pending/active/archived/blocked), 2FA fields, language/theme/timezone, brute-force counters, last_login. |
| `employee_profiles` | Extended HR card (passport, INN, address, emergency contact, education, HR notes). |
| `employee_documents` | Stored documents (contract, passport, diploma…) with file URL, mime, expiration. |
| `position_history` | Audit of position/department changes. |
| `departments` | Hierarchical via `parent_department_id`. Multilingual names. |
| `coordinator_assignments` | M:N between Koordinator users and departments. |
| `external_companies` | Contractor companies; status pending/approved/rejected; rating. |
| `projects` | Internal or external (with `external_company_id`). Has curator, progress %, budget, deadline. |
| `milestones` | Project stages; `weight` drives progress %; `payment_status`. |
| `tasks` | Full hierarchical task: project + milestone + parent + assignee + creator. Status `todo/in_progress/under_review/completed/rejected`. |
| `task_dependencies` | DAG-style dependencies. |
| `task_checklist_items`, `task_attachments`, `task_comments` (with `mentions UUID[]`), `task_watchers` | Auxiliary. |
| `deliverables` | Submissions by contractors against milestone or task. |
| `standup_reports` | Daily 3-field reports, unique per user+date. |
| `leaves` | Vacation/sick/unpaid with approval workflow. |
| `notifications` + `notification_settings` | In-app feed + per-user flags for in-app/email/telegram. |
| `invitations` | Email-link invitations (7-day TTL). |
| `password_reset_tokens` | One-time reset links (1h TTL). |
| `activity_log` | Append-only audit with old/new JSONB, IP, user-agent. |
| `project_messages` | Curator ↔ contractor chat per project. |
| `ratings` | 1–5 score on project completion; rolls up into `external_companies.rating`. |

All FKs are explicit; cascading rules follow the TZ (cascade on dependent tables, set-null on optional refs). Indexes per TZ §5 are declared in `schema.ts`.

## Migrations

```bash
pnpm db:generate    # after editing schema.ts
pnpm db:migrate     # apply pending
```

`db:push` is for prototyping only — never use against prod.
