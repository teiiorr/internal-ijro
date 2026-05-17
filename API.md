# API & Server Actions

This project uses **Server Actions** (Next.js) for mutations and **Route Handlers** for downloads/exports/webhooks. There's no public REST API by default — for a future mobile client, the actions in `src/server/actions/` are the canonical entry points.

## HTTP routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth (login, logout, csrf) |
| `/api/files/[...path]` | GET | Authenticated file download (employee docs, task attachments, deliverables) |
| `/api/export/employees` | GET | XLSX of the employee registry (HR / Direktor / O'rinbosar) |
| `/api/export/audit` | GET | XLSX audit log |
| `/api/export/weekly-report` | GET | Weekly PDF (Direktor / O'rinbosar) |
| `/api/telegram/webhook` | POST | Telegram bot webhook (verifies `X-Telegram-Bot-Api-Secret-Token`) |

## Server Actions

Auth: `setupDirektor`, `requestPasswordReset`, `resetPassword`, `acceptInvitation`, `registerContractor`, `createInvitation`.

Employees: `inviteEmployee`, `changePosition`, `archiveEmployee`, `restoreEmployee`, `upsertEmployeeProfile`, `uploadEmployeeDocument`, `deleteEmployeeDocument`.

Departments: `createDepartment`, `updateDepartment`, `deleteDepartment`, `assignCoordinator`, `unassignCoordinator`.

Tasks: `createTask`, `changeTaskStatus`, `moveTaskOnKanban`, `addComment`, `setWatcher`, `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem`, `attachFileToTask`, `removeAttachment`.

Projects: `createProject`, `createMilestone`, `setMilestoneStatus`, `setMilestonePaymentStatus`, `postProjectMessage`, `submitDeliverable`, `reviewDeliverable`, `approveContractor`, `rejectContractor`, `completeProjectWithRating`, `acceptNda`.

Standup: `submitStandup`.

Leaves: `requestLeave`, `approveLeave`, `rejectLeave`.

Notifications: `markOneRead`, `markAllRead`.

Settings: `generateTelegramLinkingCode`, `disconnectTelegram`, `setNotificationFlags`, `updateProfilePreferences`, `changePasswordSelf`, `start2faSetup`, `confirm2fa`, `disable2fa`.

## Permissions

`canAssignTaskTo(assigner, assignee)` in `src/lib/permissions/index.ts` implements TZ §4.3 exactly. Capability matrix `can(position, cap)` covers TZ §4.4 actions. Use `requireUser()` / `requirePosition([...])` from `src/lib/session.ts` at the top of every action.

## Audit

Every significant mutation calls `logActivity()` (`src/lib/audit.ts`). The function reads IP and user agent from request headers and writes JSONB old/new diffs to `activity_log`. Direktor/O'rinbosar see everything in `/audit-log`; HR sees only `employee.*`, `department.*`, `coordinator.*` rows.
