# Noncrast
AI-assisted desktop app that keeps you on-task: manage todos, run focused sessions, detect off-track activity from screen thumbnails, and log interruptions—everything stored locally in SQLite.

## Table of Contents
- Introduction
- Features
- Quick Start
- Usage Guide
- Project Architecture
- Development & Testing
- Packaging & Release
- Configuration
- Troubleshooting
- Contributing
- License

## Introduction
Noncrast is an Electron + React desktop app that combines task tracking, Pomodoro-style focus sessions, and lightweight computer-vision alerts to reduce procrastination. All data is stored locally; no cloud backend is required.

## Features
- Task board with statuses (`todo`, `in-progress`, `done`), due dates, and time targets.
- Focus sessions linked to tasks with planned vs. actual focus time.
- Interruption logging (type, notes, optional screenshot).
- Optional on-device ML that classifies your current screen to nudge you back on track.
- Settings panel for detection interval, notification toggles, and DB paths.
- Dev seed data for quick demos in dev mode.

## Quick Start
Prereqs: Node 20+, npm, Git; works on Windows/macOS/Linux with Electron tooling.

```bash
cd apps/ui-ts
npm install
npm start             # Electron Forge + Vite dev server
```

Dev mode writes the SQLite DB to a temp location per process; production stores it under `app.getPath('userData')` (see `src/config/constants.ts`).

## Usage Guide
- Tasks: add/edit/delete tasks; change status via UI; due dates & estimates are optional.
- Focus Sessions: start a session from the dashboard or a task card; stop or cancel to record outcomes.
- Interruptions: log interruptions against the active session; ML capture can auto-attach a screenshot.
- Notifications: desktop alerts when detection flags off-track activity.
- Settings: open Settings → General to toggle ML detection, tweak detection interval, or reset defaults.

## Project Architecture
- Electron main (`apps/ui-ts/src/main.ts`): creates windows, owns IPC handlers, seeds dev data, and orchestrates ML worker + notifications.
- Preload (`apps/ui-ts/src/preload.ts`): exposes a typed `window.noncrast` bridge for tasks, focus sessions, interruptions, settings, ML controls, and notifications.
- Renderer (`apps/ui-ts/src/app.tsx` + `apps/ui-ts/src/pages/*` + `apps/ui-ts/src/components/*`): React 19 + React Router UI.
- Data layer (`apps/ui-ts/src/db.ts`): SQLite via `better-sqlite3`, auto-creates/migrates `tasks`, `focus_sessions`, `interruptions`; PRAGMAs for WAL + FK; env override `NONCRAST_DB_PATH`.
- ML worker (`apps/ui-ts/src/mlWorker.js`): worker thread using Hugging Face zero-shot image classification (CLIP ViT) to label screen captures and mark “off-track”.
- Config: `apps/ui-ts/src/config/defaults.json` for DB names; `apps/ui-ts/src/config/constants.ts` for IPC channels and paths; `apps/ui-ts/src/settings/*` for schema + storage.
- Tests: Vitest suites in `apps/ui-ts/tests/`; run through Electron runtime to match native module ABI.
- Build tooling: Electron Forge + Vite (`apps/ui-ts/forge.config.ts`, `apps/ui-ts/vite.*.config.mts`); postinstall rebuilds `better-sqlite3`.
- Backend (experimental, Python): `apps/backend/app/` with FastAPI skeleton and ML notebook (`models.ipynb`).

## Development & Testing
```bash
npm run lint          # ESLint
npm test              # Vitest via Electron runtime
npm run test:watch
```
Tests are executed through `scripts/run-vitest-electron.js` to avoid native module ABI mismatch with `better-sqlite3`.

## Packaging & Release
```bash
npm run make          # platform-specific artifacts
npm run package       # raw packaged app
```
Forge makers are configured for zip, Squirrel (Windows), deb/rpm (Linux). The ML worker is unpacked via `plugin-auto-unpack-natives`.

## Configuration
- DB path override: set `NONCRAST_DB_PATH` to an absolute file path.
- Detection interval: Settings → “Interruption detection interval (s)”.
- Disable ML: toggle “Enable detection” off in Settings.
- Logs: see console output from main/worker; main uses `apps/ui-ts/src/logger.ts`.

## Troubleshooting
- Native module/ABI errors: run tests via `npm test` (uses Electron) or rebuild deps with `npm install` (postinstall runs `electron-rebuild`).
- Missing screenshots: ensure OS screen-capture permissions are granted.
- ML not starting: check Settings → “Enable detection”; renderer receives `ml:result` via IPC.

## Contributing
1) Fork and create a feature branch.
2) `npm install`, `npm start`, ensure lint/tests pass.
3) Add/adjust tests in `apps/ui-ts/tests/`.
4) Submit a PR describing changes, testing, and any UI/DB impacts.

Guidelines: TypeScript/React with ESLint defaults; keep IPC types in `apps/ui-ts/src/types.ts` in sync with renderer usage; prefer the DbClient and IPC helpers over direct DB access.

## Figma
[Designs](https://www.figma.com/design/bjJME5SOd0qAG9Pidk3tkw/Noncrast?node-id=18-93&t=y1iE7LfAgKHROv3n-0)

## License
MIT
