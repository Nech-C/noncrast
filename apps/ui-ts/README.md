# Noncrast UI (Electron + Vite)
Desktop task and focus-session tracker built with Electron Forge, Vite, and React. Local data is stored in SQLite via `better-sqlite3` with a small DbClient wrapper in `src/db.ts`.

## Tech Stack
- Electron Forge + Vite (main/preload/renderer)
- React 19 + React Router
- TypeScript
- SQLite via `better-sqlite3`
- Vitest for testing, ESLint for linting

## Project Layout
- `src/db.ts` — SQLite client; bootstraps schema and handles CRUD for tasks, focus sessions, interruptions.
- `src/config/defaults.json` — DB filenames/paths and table names.
- `src/types.ts` — shared domain types (Task, FocusSession, Interruption).
- `tests/` — Vitest suites (e.g., `db.test.ts`) and helpers.
- `scripts/run-vitest-electron.js` — runs Vitest using Electron’s Node runtime to keep native modules ABI-compatible.

## Database Schema (created automatically)
**tasks** (`defaults.db.tasks_table_name`)
- `id` INTEGER PK
- `task_name` TEXT NULL
- `description` TEXT NULL
- `status` TEXT CHECK in (`todo`,`in-progress`,`done`) DEFAULT `todo`
- `created_at` INTEGER
- `updated_at` INTEGER
- `completed_at` INTEGER
- `timespent` INTEGER
- `timeset` INTEGER
- `due` INTEGER NULL

**focus_sessions** (`defaults.db.focus_sessions_table_name`)
- `id` INTEGER PK
- `task_id` INTEGER REFERENCES `tasks`(id)
- `started_at` INTEGER NOT NULL
- `ended_at` INTEGER NULL
- `planned_ms` INTEGER
- `focus_ms` INTEGER DEFAULT 0
- `status` TEXT CHECK in (`active`,`completed`,`cancelled`) DEFAULT `active`
- `notes` TEXT NULL

**interruptions_table** (`defaults.db.interruptions_table_name`)
- `id` INTEGER PK
- `session_id` INTEGER NOT NULL REFERENCES `focus_sessions`(id) ON DELETE CASCADE
- `occurred_at` INTEGER NOT NULL
- `duration_ms` INTEGER NULL
- `type` TEXT NULL
- `note` TEXT NULL

Pragmas: WAL journal mode, `synchronous = NORMAL`, foreign keys ON.

## UI Flow (user actions)
- Manage tasks: create tasks with name/description, mark status (`todo`, `in-progress`, `done`), set time targets and due dates.
- Run focus sessions: start a timed focus session (optionally tied to a task), track planned vs actual focus time, add notes, end or cancel sessions.
- Track interruptions: log interruptions against an active session with timestamps, types, notes, and optional duration; deleting a session cascades its interruptions.
- Review history: list tasks (by status), list focus sessions, and see interruptions per session.

## Development
- Install deps: `npm install`
- Start app: `npm start`
- Lint: `npm run lint`

## Testing (Electron runtime)
Vitest is launched through Electron to avoid native module ABI mismatches with `better-sqlite3`:
```bash
npm test         # single run
npm run test:watch
```
This uses `ELECTRON_RUN_AS_NODE=1` under the hood; no rebuild needed when switching between `npm start` and tests.

## Troubleshooting
- If you see native module ABI errors, run tests via the provided scripts (above) so they share Electron’s ABI.
- Override DB location with `NONCRAST_DB_PATH` (absolute file path) if you need to isolate data per run.
