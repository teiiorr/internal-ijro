# USERS

The system has 9 position codes (TZ §4.1). Seven form a hierarchy, two (HR, Kontragent) are functional.

| Code | Display | Can do |
|---|---|---|
| `direktor` | Direktor | Everything: settings, departments, positions, audit log, full task assignment, completes projects. |
| `orinbosar` | O'rinbosar | Like Direktor but cannot edit company settings or assign someone to Direktor role. |
| `koordinator` | Koordinator | Manages curated departments, approves contractors, creates projects, assigns tasks within curated departments. |
| `bolim_boshligi` | Bo'lim Boshlig'i | Manages a single department; assigns tasks within the department. |
| `bosh_mutaxassis` | Bosh Mutaxassis | Lead specialist; assigns tasks to direct reports via `reports_to_user_id`. |
| `yetakchi_mutaxassis` | Yetakchi Mutaxassis | Same as Bosh Mutaxassis, junior tier. |
| `mutaxassis` | Mutaxassis | Specialist. Receives and executes tasks; cannot assign. |
| `hr` | HR | Manages employees, documents, leaves; reads HR-scoped audit log. Cannot assign tasks. |
| `kontragent` | Kontragent | Isolated portal; sees only their own projects and chats with curators. |

## Onboarding

1. **Direktor** is created via `/setup` (no users yet) or via seed.
2. **Employees** — HR / Direktor / O'rinbosar invites via `/employees/new`. Recipient gets a 7-day email link `/invite/<token>`.
3. **Contractors** — self-register via `/register-contractor`. Pending until a manager approves in `/contractors`.

## Daily flows

- Direktor / O'rinbosar / Koordinator: dashboard → tasks across all (or curated) departments, audit log, project oversight.
- Bo'lim Boshlig'i: their department's tasks, employee list scoped to dept, daily standup view.
- Bosh / Yetakchi Mutaxassis: tasks of their direct reports + their own.
- Mutaxassis: My tasks (today/week/soon/overdue), submit daily standup.
- HR: registry, documents, position changes, leaves approval, kadrovaya audit log.
- Kontragent: their projects only, submit deliverables, chat with curator, see milestone payment statuses.

## Security defaults

- bcrypt cost 12 for password hashing.
- 5 failed logins → 15 minute lockout.
- Optional TOTP 2FA — strongly recommended for Direktor and O'rinbosar.
- Sessions are 30-day JWT cookies (HTTPOnly).
